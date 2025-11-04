import { FastifyInstance } from "fastify";
import { getTournamentsByUserAsync } from "../controllers/tournamentController.ts";

export async function tournamentRoutes(server: FastifyInstance)
{
	server.get(
		"/",
		{
			config: { rateLimit: { timeWindow: '1 minute', max: 200 } },
			preHandler: [ server.authenticate ]
		},
		getTournamentsByUserAsync
	);
}