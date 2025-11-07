import { FastifyReply, FastifyRequest } from "fastify";
import { withdawBalance, getAllTransactions, getUsersTransactions } from "../services/transactionService.ts";
import { getRoomByUserId } from "../services/roomService.ts";
import { getCurrentUser } from "../services/userService.ts";

export async function getUsersTransactionsAsync(
	request: FastifyRequest,
	response: FastifyReply,
)
{
	const user = await getCurrentUser(request.cookies.sessionId!)
	const trs = await getUsersTransactions(user.id);

	if (trs)
	{
		return response.code(200).send(
		{
			transactions: trs
		});
	}

	return response.code(404).send(
	{
		message: `No transactions found`
	});
}

export async function withdrawAmountAsync(
	request: FastifyRequest<{ Querystring: { amount: string } }>,
	response: FastifyReply,
)
{
	const amount = parseFloat(request.query.amount);
	const user = await getCurrentUser(request.cookies.sessionId!);

	if (user && !Number.isNaN(amount))
	{
		const updatedBalance = await withdawBalance(user, amount);

		if (updatedBalance)
		{
			return response.code(200).send(
			{
				message: `Successfully withdrew ${amount}`,
				balance: updatedBalance
			});
		}
	}

	return response.code(401).send(
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
			return response.code(200).send(
			{
				message: `Successfully withdrew ${room.entryFee}`,
				balance: updatedBalance
			});
		}
	}

	return response.code(401).send(
	{
		message: `Withdrawal failed`
	});
}