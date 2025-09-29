import { FastifyReply, FastifyRequest } from "fastify";
import { createSession, deleteSession, deleteSessionByUserId } from "./sessionService.ts";
import { CreateSessionData } from "../repositories/sessionRepository/sessionRepository.ts";

export async function setSessionCookie(
	request: FastifyRequest,
	response: FastifyReply,
	user: any)
{
	try
	{
		const accessToken = request.jwt.sign(user, { expiresIn: '15m' });
		const refreshToken = request.jwt.sign(user, { expiresIn: '7d' });
	
		await removeSessionCookieByUserId(response, user.id);
	
		const sessionData: CreateSessionData =
		{
			userId: user.id,
			username: user.username,
			email: user.email,
			accessToken,
			refreshToken
		};
	
		const session = await createSession(sessionData);
	
		response.setCookie('sessionId', session.sessionId,
		{
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			path: "/",
			maxAge: 7 * 24 * 60 * 60
		});
	}
	catch (error)
	{
		console.log(error);
	}
}

async function removeSessionCookieByUserId(
	response: FastifyReply,
	userId: string
)
{
	try
	{
		removeCookie(response, "sessionId");
		await deleteSessionByUserId(userId);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function removeSessionCookie(
	response: FastifyReply,
	sessionId: string
)
{
	try
	{
		removeCookie(response, "sessionId");
		await deleteSession(sessionId);
	}
	catch (error)
	{
		console.log(error);
	}
}

export function removeCookie(
	response: FastifyReply,
	name: string,
)
{
	response.clearCookie(name);
}
