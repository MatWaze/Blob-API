import { FastifyInstance } from "fastify";
import { userSchemas } from "../models/userSchema.ts";
import { getAllUsersAsync, registerAsync, loginAsync, confirmEmailAsync, removeUserAsync, logoutAsync, getTokens, getCurrentUserAsync } from "../controllers/userController.ts";
import { googleSignInAsync } from "../controllers/googleOauthController.ts";

async function userRoutes(server: FastifyInstance)
{
	server.get(
		"/current",
		getCurrentUserAsync
	)

	// POST api/users/register
	server.post(
		"/register",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 1000 } },
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
			config: { rateLimit: { timeWindow: '1 minute', max: 1000 } },
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

	// GET api/users/email/confirm?nonce={nonce}
	server.get(
		"/email/confirm",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 500 } },
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
			config: { rateLimit: { timeWindow: '1 minute', max: 1000 } },
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
			config: { rateLimit: { timeWindow: '1 minute', max: 1000 } },
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
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 1000 } },
			preHandler: [ server.authenticate ]
		},
		logoutAsync
	);

	// GET api/users/tokens
	server.get(
		"/tokens",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 1000 } },
		},
		getTokens
	);
}

export default userRoutes;

