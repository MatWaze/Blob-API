import { FastifyReply } from "fastify";

export function saveCookie(
	response: FastifyReply,
	name: string,
	cookie: string
)
{
	response.setCookie(
		name,
		cookie,
		{
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // send cookie only over HTTPS in prod
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 15
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
