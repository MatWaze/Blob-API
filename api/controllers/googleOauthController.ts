import { getGoogleOAuthTokens, getGoogleUser } from "../services/googleSignInService.ts";
import { randomBytes } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { GoogleCodeType } from "../models/userSchema.ts";
import { createUserAsync, getUserByEmailAsync } from "../services/userService.ts";
import { saveCookie } from "../services/cookieService.ts";

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
		const token = request.jwt.sign(rest);

		saveCookie(response, "accessToken", token);

		return response.code(200).send({ message: "Login successful" });;
	}
	catch (e)
	{
		console.log(e);
	}
}