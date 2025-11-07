import { FastifyInstance } from "fastify";
import { getUsersTransactionsAsync, withdrawAmountAsync, withdrawFeeAsync } from "../controllers/transactionController.ts";

export async function transactionRoutes(server: FastifyInstance)
{
	server.get(
		"/",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 400 } },
			preHandler: [ server.authenticate ]
		},
		getUsersTransactionsAsync
	);

	server.post(
		"/withdraw",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 100 } },
			preHandler: [ server.authenticate ],
			schema:
			{
				querystring: new String("amount")
			}
		},
		withdrawAmountAsync
	);

	server.post(
		"/room/fee",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 3000 } },
			preHandler: [ server.authenticate ],
		},
		withdrawFeeAsync
	);
}