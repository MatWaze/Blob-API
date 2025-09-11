import { FastifyReply, FastifyRequest } from "fastify";
import { TransferEvent, getTransfersSnowTrace } from "../services/blockChainService";

export async function getTransfersSnowrtraceAsync(
	request: FastifyRequest<{ Params: { recipientAddress: string }; }>
) : Promise<TransferEvent[]>
{
	return await getTransfersSnowTrace(request.params.recipientAddress);
}