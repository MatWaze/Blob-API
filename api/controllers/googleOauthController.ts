import { getGoogleOAuthTokens, getGoogleUser } from "../services/googleSignInService.ts";
import { randomBytes } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { GoogleCodeType } from "../models/userSchema.ts";
import { createUserAsync, getUserByEmailAsync } from "../services/userService.ts";
import { setSessionCookie } from "../services/cookieService.ts";

export async function googleSignInAsync(
	request: FastifyRequest<{ Querystring: GoogleCodeType }>,
	response: FastifyReply
)
{
	const code = request.query.code;

	try
	{
		const tokens = await getGoogleOAuthTokens({ code });

		if (!tokens)
			return;
	
		const { id_token, access_token } = tokens!;

		// get user with tokens
		const googleUser = await getGoogleUser({ id_token, access_token });

		if (!googleUser)
			return;

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

		await setSessionCookie(request, response, rest);
		// saveCookie(response, "accessToken", accessToken);
		// saveCookie(response, "refreshToken", refreshToken);

		response.redirect(process.env.CLIENT!);
		// return response.code(200).send(
		// {
		// 	message: "Login successful",
		// 	user: {
		// 		id: user.id,
		// 		username: user.username,
		// 		email: user.email
		// 	}
		// });
	}
	catch (e)
	{
		console.log(e);
		// For now redirect to the main page as well. Later on redirect to error page
		response.redirect(process.env.CLIENT!);
	}
}