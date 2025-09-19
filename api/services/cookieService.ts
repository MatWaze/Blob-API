import { FastifyReply, FastifyRequest } from "fastify";
import { createSession, deleteSession, deleteSessionByUserId } from "./sessionService";
import { CreateSessionData } from "../repositories/sessionRepository/sessionRepository";


export function saveCookie(
	response: FastifyReply,
	name: string,
	cookie: string
)
{
	response.clearCookie(name);

	const isRefreshToken = name === 'refreshToken';
	const maxAge = isRefreshToken ? 7 * 24 * 60 * 60 : 15 * 60; // 7 days vs 15 minutes

	response.setCookie(
		name,
		cookie,
		{
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // send cookie only over HTTPS in prod
			sameSite: "lax",
			path: "/",
			maxAge: maxAge
		}
	);
}

export async function setSessionCookie(
	request: FastifyRequest,
	response: FastifyReply,
	user: any)
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
		sameSite: "lax",
		path: "/",
		maxAge: 7 * 24 * 60 * 60
	});
}

async function removeSessionCookieByUserId(
	response: FastifyReply,
	userId: string
)
{
	removeCookie(response, "sessionId");
	await deleteSessionByUserId(userId);
}

export async function removeSessionCookie(
	response: FastifyReply,
	sessionId: string
)
{
	removeCookie(response, "sessionId");
	await deleteSession(sessionId);
}

export function removeCookie(
	response: FastifyReply,
	name: string,
)
{
	response.clearCookie(name);
}
