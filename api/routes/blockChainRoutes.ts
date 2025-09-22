import { FastifyInstance } from "fastify";
import { getTransfersSnowrtraceAsync } from "../controllers/blockChainController.ts";

async function blockChainRoutes(server: FastifyInstance)
{
	// GET /api/blockchain/snowtrace/owner/transactions/{recipientAddress}
	server.get(
		"/snowtrace/owner/transactions/:recipientAddress",
		getTransfersSnowrtraceAsync
	);
}

export default blockChainRoutes;