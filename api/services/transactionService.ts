import transactionRepo from "../repositories/transactionRepository/transactionFactory.ts";
import { TransactionStatus, TransactionType } from "../repositories/transactionRepository/transactionRepository.ts";
import { updateBalance, updateWithdrawabalBalance } from "./userService.ts";
import { from } from "linq-to-typescript"

export async function getAllTransactions()
{
	try
	{
		const lastWeekDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
		return await from(await transactionRepo.getAllTransactionsAsync())
			.whereAsync(async t => t.createdAt >= lastWeekDate);
	}
	catch (e)
	{
	}
}

export async function getTransaction(tId: string)
{
	try
	{
		return await transactionRepo.getTransactionAsync(tId);
	}
	catch (e)
	{
	}
}

export async function getUsersTransactions(userId: string)
{
	try
	{
		const lastWeekDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);

		return from(await transactionRepo.getUsersTransactionsAsync(userId))
			.whereAsync(async t =>
				(t.type === TransactionType.DEPOSIT || t.type === TransactionType.WITHDRAWAL) &&
				t.createdAt >= lastWeekDate
			);
	}
	catch (e)
	{
	}
}

export async function updateTransactionStatus(id: string, status: TransactionStatus)
{
	try
	{
		await transactionRepo.updateTransactionStatus(id, status);
	}
	catch (e)
	{
		
	}
}

export async function createTransaction(
	{
		type,
		amount,
		userId,
		status
	} :
	{
		type: TransactionType
		amount: number,
		userId: string,
		status: TransactionStatus
	})
{
	try
	{
		await transactionRepo.createTransactionAsync({ type, amount, userId, status });
	}
	catch (e)
	{
		
	}
}

export async function depositBonusBlob(user: any)
{
	try
	{
		const bonusAmount = 10;
	
		await createTransaction(
		{
			type: TransactionType.BONUS,
			amount: bonusAmount,
			userId: user.Id,
			status: TransactionStatus.SUCCESS
		});
	
		updateBalance(user, bonusAmount);
	}
	catch (e)
	{
		
	}
}

export async function depositBlob(
	user: any,
	amount: number,
	withdrawalBalanceUpdate = false
)
{
	try
	{
		await createTransaction(
		{
			type: TransactionType.DEPOSIT,
			amount: amount,
			userId: user.Id,
			status: TransactionStatus.SUCCESS
		});
	
		updateBalance(user, user.balance + amount);

		if (withdrawalBalanceUpdate)
			updateWithdrawabalBalance(user, user.withdrawAmount + amount);
	}
	catch (e)
	{

	}
}

export async function withdawBalance(user: any, amount: number)
	: Promise<number | undefined>
{
	try
	{
		if (amount <= user.withdrawAmount)
		{
			await createTransaction(
			{
				type: TransactionType.WITHDRAWAL,
				amount: amount,
				userId: user.Id,
				status: TransactionStatus.SUCCESS
			});
	
			const updatedBalance = user.balance - amount;
			await updateWithdrawabalBalance(user, user.withdrawAmount - amount);
			await updateBalance(user, updatedBalance);

			return updatedBalance;
		}
		else
		{
			await createTransaction(
			{
				type: TransactionType.WITHDRAWAL,
				amount: amount,
				userId: user.Id,
				status: TransactionStatus.FAIL
			});

			return undefined;
		}
	}
	catch (e)
	{
		return undefined;
	}
}

export async function payFee(user: any, amount: number)
	: Promise<number | undefined>
{
	try
	{
		if (amount <= user.balance)
		{
			await createTransaction(
			{
				type: TransactionType.FEE,
				amount: amount,
				userId: user.Id,
				status: TransactionStatus.SUCCESS
			});
	
			const updatedBalance = user.balance - amount;

			if (updatedBalance < user.withdrawAmount)
				await updateWithdrawabalBalance(user, updatedBalance);
			await updateBalance(user, updatedBalance);

			return updatedBalance;
		}
		else
		{
			await createTransaction(
			{
				type: TransactionType.FEE,
				amount: amount,
				userId: user.Id,
				status: TransactionStatus.FAIL
			});

			return undefined;
		}
	}
	catch (e)
	{
		return undefined;
	}
}