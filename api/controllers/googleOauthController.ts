import { getGoogleOAuthTokens, getGoogleUser } from "../services/googleSignInService.ts";
import { randomBytes } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { GoogleCodeType } from "../models/userSchema.ts";
import { createUserAsync, getUserByEmailAsync } from "../services/userService.ts";
import { sessionStore } from "../services/sessionStorageService.ts";

export async function googleSignInAsync(
	request: FastifyRequest<{ Querystring: GoogleCodeType }>,
	response: FastifyReply
)
{
	const code = request.query.code;

	try
	{
		const { id_token, access_token } = await getGoogleOAuthTokens({ code });

		console.log({ id_token, access_token });

		// get user with tokens
		const googleUser = await getGoogleUser({ id_token, access_token });

		console.log({ googleUser });

		if (!googleUser.verified_email)
		{
			return response.code(403).send("Google account isn't verified");
		}

		var user = await getUserByEmailAsync(googleUser.email);

		if (!user)
		{
			user = await createUserAsync(
			{
				email: googleUser.email,
				username: googleUser.name,
				password: randomBytes(32).toString("hex"),
				authMethod: "GOOGLE"
			});
		}
		
		const { password, ...rest } = user;
		const accessToken = request.jwt.sign(rest, { expiresIn: '15m' });
		const refreshToken = request.jwt.sign(rest, { expiresIn: '7d' });

		const sessionId = sessionStore.createSession(user.id, user.username, user.email, accessToken, refreshToken);

		response.setCookie('sessionId', sessionId, {
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 7 * 24 * 60 * 60 // 7 days
		});
		// saveCookie(response, "accessToken", accessToken);
		// saveCookie(response, "refreshToken", refreshToken);

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
	catch (e)
	{
		console.log(e);
	}
}