import prisma from "../../prisma/prismaInstance.ts";

export enum TransactionType
{
	BONUS = "BONUS",
	WITHDRAWAL = "WITHDRAWAL",
	PURCHASE = "PURCHASE",
	DEPOSIT = "DEPOSIT"
}

export enum TransactionStatus
{
	PENDING = "PENDING",
	SUCCESS = "SUCCESS",
	FAIL = "FAIL"
}

export class TransactionRepository
{
	async getAllTransactionsAsync()
	{
		return await prisma.transaction.findMany();
	}

	async getTransactionAsync(id: string)
	{
		return await prisma.transaction.findUnique(
		{
			where: { id }
		});
	}

	async getUsersTransactionsAsync(userId: string)
	{
		return await prisma.transaction.findMany(
		{
			where: { userId }
		});
	}

	async createTransactionAsync(
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
		await prisma.transaction.create(
		{
			data: { type, amount, userId, status: TransactionStatus.PENDING }
		})
	}

	async updateTransactionStatus(id: string, status: TransactionStatus)
	{
		await prisma.transaction.update(
		{
			where: { id },
			data: { status }
		});
	}
}