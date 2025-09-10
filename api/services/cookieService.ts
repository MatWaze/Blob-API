import { FastifyReply } from "fastify";

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

export function removeCookie(
	response: FastifyReply,
	name: string
)
{
	response.clearCookie(name);
}
