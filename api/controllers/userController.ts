import { FastifyReply, FastifyRequest } from "fastify";
import { ConfirmEmailType, CreateUserType, LoginType } from "../models/userSchema";
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
from "../services/userService";

export async function registerAsync(
	request: FastifyRequest<{ Body: CreateUserType }>,
	response: FastifyReply
)
{
	const body = request.body;

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

		return { accessToken: request.jwt.sign(rest) };
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