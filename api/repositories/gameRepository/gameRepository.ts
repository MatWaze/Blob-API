import prisma from "../../prisma/prismaInstance.ts"

export class GameRepository
{
	async getAllGamesAsync()
	{
		return await prisma.game.findMany();
	}

	async getGameByIdAsync(id: number)
	{
		return await prisma.game.findUnique(
		{
			where: { id },
		});
	}

	async createGameAsync(name: string)
	{
		return await prisma.game.create(
		{
			data: { name },
		});
	}
}