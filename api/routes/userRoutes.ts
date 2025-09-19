import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { userSchemas } from "../models/userSchema.ts";
import { getAllUsersAsync, registerAsync, loginAsync, confirmEmailAsync, removeUserAsync, logoutAsync, getTokens } from "../controllers/userController.ts";
import { googleSignInAsync } from "../controllers/googleOauthController.ts";

async function userRoutes(server: FastifyInstance)
{
	// POST api/users/register
	server.post(
		"/register",
		{
			schema:
			{
				body: userSchemas.createUserModel,
				response:
				{
					201: userSchemas.getUserModel
				}
			}
		},
		registerAsync
	);

	// POST api/users/login
	server.post(
		"/login",
		{
			schema:
			{
				body: userSchemas.loginUserModel,
				// response:
				// {
				// 	200: userSchemas.getLoginUserModel
				// }
			},
		},
		loginAsync
	)

	// POST api/users/email/confirm?nonce={nonce}
	server.post(
		"/email/confirm",
		{
			schema:
			{
				querystring: userSchemas.confirmEmailModel,
				response:
				{
					200: userSchemas.getUserModel
				}
			}
		},
		confirmEmailAsync
	);

	// GET api/users
	server.get(
		"/",
		{
			preHandler: [ server.authenticate ]
		},
		getAllUsersAsync
	);

	// DELETE api/users/{id}
	// server.delete(
	// 	"/:id",
	// 	removeUserAsync
	// )

	server.get(
		"/oauth/google",
		{
			schema:
			{
				querystring: userSchemas.googleCodeModel
			}
		},
		googleSignInAsync
	)

	// POST api/users/logout
	server.post(
		"/logout",
		logoutAsync
	);

	// GET api/users/tokens
	server.get(
		"/tokens",
		getTokens
	);
}

export default userRoutes;

