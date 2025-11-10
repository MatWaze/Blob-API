import { FastifyReply, FastifyRequest } from "fastify";
import { withdawBalance, getUsersTransactions } from "../services/transactionService.ts";
import { getRoomByUserId } from "../services/roomService.ts";
import { getCurrentUser } from "../services/userService.ts";
import { sendTokens } from "../services/blockChainService.ts";
import { WithdrawAmountType } from "../models/userSchema.ts";

export async function getUsersTransactionsAsync(
	request: FastifyRequest,
	response: FastifyReply,
)
{
	const user = await getCurrentUser(request.cookies.sessionId!)
	const transactions = await getUsersTransactions(user.id);

	if (transactions)
	{
		response.code(200).send({ transactions: await transactions.toArray() });
	}
}

export async function withdrawAmountAsync(
	request: FastifyRequest<{ Querystring: WithdrawAmountType }>,
	response: FastifyReply,
)
{
	console.log("here")
	const amount = request.query.amount;
	const user = await getCurrentUser(request.cookies.sessionId!);

	if (user && !Number.isNaN(amount))
	{
		// const updatedBalance = await withdawBalance(user, amount);

		// if (updatedBalance)
		// {
			await sendTokens("0x582a69Cad1Ae9c55a3D2aEb7f19c17c5D376B27C", amount);
		// 	response.code(200).send(
		// 	{
		// 		message: `Successfully withdrew ${amount}`,
		// 		balance: updatedBalance
		// 	});
			return;
		// }
	}

	response.code(401).send(
	{
		message: `Withdrawal failed`
	});
}

export async function withdrawFeeAsync(
	request: FastifyRequest,
	response: FastifyReply
)
{
	const user = await getCurrentUser(request.cookies.sessionId!);
	const room = getRoomByUserId(user?.userId!);

	if (room)
	{
		const updatedBalance = await withdawBalance(user, room.entryFee);

		if (updatedBalance)
		{
			response.code(200).send(
			{
				message: `Successfully withdrew ${room.entryFee}`,
				balance: updatedBalance
			});
			return;
		}
	}

	response.code(401).send(
	{
		message: `Withdrawal failed`
	});
}