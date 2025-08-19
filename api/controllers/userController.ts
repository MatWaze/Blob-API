import { FastifyReply, FastifyRequest } from "fastify";
import { ConfirmEmailType, CreateUserType, LoginType } from "../models/userSchema.ts";
import
{
	createUserAsync,
	getUserByEmailAsync,
	getUserByNonceAsync,
	getUsersAsync,
	verifyPassword,
	setEmailConfirmed,
	deleteUserAsync
}
from "../services/userService.ts";
import QueryString from "qs";
import { saveCookie } from "../services/cookieService.ts";

export async function registerAsync(
	request: FastifyRequest<{ Body: CreateUserType }>,
	response: FastifyReply
)
{
	const body = request.body;
	body.authMethod = "EMAIL";
	console.log(request.body);
	try
	{
		const user = await createUserAsync(body);

		return response.code(201).send(user);
	}
	catch (e)
	{
		console.log(e);
		return response.code(500).send(e);
	}
}

export async function getAllUsersAsync()
{
	const users = await getUsersAsync();

	return users;
}

export async function loginAsync(
	request: FastifyRequest<{ Body: LoginType; }>,
	response: FastifyReply
)
{
	const body = request.body;

	const user = await getUserByEmailAsync(body.email);

	if (!user)
	{
		return response.code(401).send(
		{
			message: "Invalid email or password",
		});
	}

	if (user.authMethod == "GOOGLE")
	{
		return response.code(401).send(
		{
			message: "Account uses Google Sign-in to log in"
		});
	}

	if (!(user?.emailVerified?.isVerified))
	{
		return response.code(401).send(
		{
			message: "Email isn't verified"
		});
	}

	const passwordsMatch = await verifyPassword(body.password, user.password);

	if (passwordsMatch)
	{
		const { password, ...rest } = user;
		const accessToken = request.jwt.sign(rest, { expiresIn: '15m' });
		const refreshToken = request.jwt.sign(rest, { expiresIn: '7d' });

		saveCookie(response, "accessToken", accessToken);
		saveCookie(response, "refreshToken", refreshToken);

		return response.code(200).send({ message: "Login successful" });
	}

	return response.code(401).send(
	{
		message: "Invalid email or password",
	});
}

export async function confirmEmailAsync(
	request: FastifyRequest<{ Querystring: ConfirmEmailType }>,
	response: FastifyReply
)
{
	const user = await getUserByNonceAsync(request.query.nonce);

	if (!user)
	{
		return response.code(401).send(
		{
			message: "Invalid nonce"
		});
	}

	if (user.emailVerified.isVerified)
	{
		return response.code(401).send(
		{
			message: "Email has already been verified"
		});
	}

	await setEmailConfirmed(user);
	return response.code(200).send(user);
}

export async function removeUserAsync(
	request: FastifyRequest<{ Params: { id: string } }>,
	response: FastifyReply
)
{
	try
	{
		await deleteUserAsync(request.params.id);

		// No content
		response.code(204).send();
	}
	catch (e)
	{
		response.code(500).send({ error: "Failed to delete user" });
	}
}

export async function refreshTokenAsync(
	request: FastifyRequest,
	response: FastifyReply
)
{
	return await request.server.refreshAccessToken(request, response);
}

export async function logoutAsync(
	request: FastifyRequest,
	response: FastifyReply
)
{
	response.clearCookie('accessToken');
	response.clearCookie('refreshToken');
	return response.code(200).send({ message: "Logged out successfully" });
}

export async function checkTokenStatusAsync(
	request: FastifyRequest,
	response: FastifyReply
)
{
	const accessToken = request.cookies.accessToken;
	const refreshToken = request.cookies.refreshToken;

	if (!accessToken && !refreshToken)
	{
		return response.code(401).send({ 
			status: 'no_tokens',
			message: 'No tokens found',
			needsLogin: true 
		});
	}

	// Check access token
	if (accessToken)
	{
		try
		{
			await request.server.jwt.verify(accessToken);
			return response.code(200).send({ 
				status: 'valid',
				message: 'Access token is valid' 
			});
		}
		catch (e)
		{
			// Access token invalid, check refresh token
		}
	}

	// Check refresh token
	if (refreshToken)
	{
		try
		{
			await request.server.jwt.verify(refreshToken);
			return response.code(200).send({ 
				status: 'needs_refresh',
				message: 'Access token expired but refresh token valid',
				needsRefresh: true 
			});
		}
		catch (e)
		{
			return response.code(401).send({ 
				status: 'expired',
				message: 'Both tokens expired',
				needsLogin: true 
			});
		}
	}

	return response.code(401).send({ 
		status: 'invalid',
		message: 'Invalid token state',
		needsLogin: true 
	});
}
