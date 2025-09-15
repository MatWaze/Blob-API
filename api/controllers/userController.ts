import { FastifyReply, FastifyRequest } from "fastify";
import { ConfirmEmailType, CreateUserType, LoginType, UserIdType } from "../models/userSchema.ts";
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
import { sessionStore } from "../services/sessionStorageService.ts";
import { FastifyJWT } from "@fastify/jwt";
import { removeCookie, setSessionCookie } from "../services/cookieService.ts";
import { getSession, updateSessionAccessToken } from "../services/sessionService.ts";

export async function registerAsync(
	request: FastifyRequest<{ Body: CreateUserType }>,
	response: FastifyReply
)
{
	const { authMethod, ...body }= request.body;

	try
	{
		const user = await createUserAsync({...body, authMethod: "EMAIL" });

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
		await setSessionCookie(request, response, rest);

		return response.code(200).send(
		{
			message: "Login successful",
			user: {
				id: user.id,
				username: user.username,
				email: user.email
			}
		});
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

// export async function refreshTokenAsync(
// 	request: FastifyRequest,
// 	response: FastifyReply
// )
// {
// 	return await request.server.refreshAccessToken(request, response);
// }

export async function logoutAsync(
	request: FastifyRequest,
	response: FastifyReply
)
{
	// response.clearCookie('accessToken');
	// response.clearCookie('refreshToken');
	removeCookie(response, 'sessionId');
	return response.code(200).send({ message: "Logged out successfully" });
}

export async function getTokens(
	request: FastifyRequest<{ Querystring: UserIdType }>,
	response: FastifyReply
)
{
	try
	{
		const sessionId = request.cookies.sessionId;

		if (!sessionId)
		{
			return response.code(401).send({
				success: false,
				message: 'No active session for user',
				needsLogin: true
			});
		}

		const sessionData = await getSession(sessionId);

		if (!sessionData)
		{
			return response.code(401).send({
				success: false,
				message: 'No session data for this id',
				needsLogin: true
			});
		}

		let accessToken = sessionData.accessToken;
		
		if (accessToken)
		{
			try
			{
				request.jwt.verify(accessToken);
			}
			catch (error)
			{
				console.log(`access token error: ${error}`);
				if (sessionData.refreshToken)
				{
					try
					{
						const decoded = request.jwt.verify(sessionData.refreshToken) as FastifyJWT;
						
						accessToken = request.jwt.sign(
						{
							id: decoded.id,
							username: decoded.username,
							email: decoded.email
						}, { expiresIn: '15m' });

						updateSessionAccessToken(sessionId, { accessToken });
					}
					catch (error)
					{
						// sessionStore.destroySession(sessionId);
						return response.code(401).send({
							success: false,
							message: `Session problem: ${error}`,
							needsLogin: true
						});
					}
				}
			}
		}

		return response.send({
			success: true,
			accessToken: accessToken,
			sessionId: sessionData.sessionId,
			user: {
				id: sessionData.userId,
				username: sessionData.username,
				email: sessionData.email
			}
		});
	}
	catch (error)
	{
		console.error("Token retrieval error:", error);
		return response.code(500).send({
			success: false,
			message: 'Internal server error'
		});
	}
}