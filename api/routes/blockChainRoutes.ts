import { FastifyInstance } from "fastify";
import { getTransfersSnowrtraceAsync, transferWebhook } from "../controllers/blockChainController.ts";

async function blockChainRoutes(server: FastifyInstance)
{
	// GET /api/blockchain/snowtrace/owner/transactions/{recipientAddress}
	server.get(
		"/snowtrace/owner/transactions/:recipientAddress",
		getTransfersSnowrtraceAsync
	);

	server.post(
		"/webhooks/transfer",
		transferWebhook
	)
}

export default blockChainRoutes;