import { FastifyReply, FastifyRequest } from "fastify";
import { TransferEvent, getTransfersSnowTrace, processEvent } from "../services/blockChainService.ts";
import { ethers } from "ethers";

export interface WebhookBody
{
	webhookId: string,
	eventType: string,
	messageId: string,
	event: WebhookBodyEvent
}

interface WebhookBodyEvent
{
	transaction:
	{
		blockHash: string,
		blockNumber: string,
		gas: string,
		erc20Transfers: [
			{
				transactionHash: string,
				from: string,
				to: string,
				value: string
			}
		]
	}
}

export async function getTransfersSnowrtraceAsync(
	request: FastifyRequest<{ Params: { recipientAddress: string }; }>
) : Promise<TransferEvent[] | undefined>
{
	return await getTransfersSnowTrace(request.params.recipientAddress);
}

export async function transferWebhook(
	request: FastifyRequest<{ Body: WebhookBody }>
)
{
	console.log("TRANSFER HAPPENED");
	const body: WebhookBody = request.body;
	
	processEvent(body);
}