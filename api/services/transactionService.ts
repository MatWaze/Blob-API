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
		return await transactionRepo.getUsersTransactionsAsync(userId);
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
		userId
	} :
	{
		type: string
		amount: number,
		userId: string
	})
{
	try
	{
		await transactionRepo.createTransactionAsync({ type, amount, userId });
	}
	catch (e)
	{
		
	}
}

export async function depositBonus(user: any)
{
	try
	{
		const bonusAmount = 10;
	
		await createTransaction(
		{
			type: TransactionType.BONUS,
			amount: bonusAmount,
			userId: user.Id
		});
	
		updateBalance(user, bonusAmount);	
	}
	catch (e)
	{
		
	}
}

export async function depositWonBlob(user: any, amount: number)
{
	try
	{
		await createTransaction(
		{
			type: TransactionType.DEPOSIT,
			amount: amount,
			userId: user.Id
		});
	
		updateBalance(user, user.balance + amount);
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
				userId: user.Id
			});
	
			const updatedBalance = user.balance - amount;
			await updateWithdrawabalBalance(user, user.withdrawAmount - amount);
			await updateBalance(user, updatedBalance);

			return updatedBalance;
		}
		else
		{
			return undefined;
		}
	}
	catch (e)
	{
		return undefined;
	}
}