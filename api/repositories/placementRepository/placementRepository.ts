import prisma from "../../prisma/prismaInstance.ts";

export class PlacementRepository
{
	async getPlacementsByGameAsync(gameId: number)
	{
		return await prisma.placement.findMany(
		{
			where: { gameId },
		});
	}

	async createPlacementAsync(gameId: number, name: string) 
	{
		return await prisma.placement.create(
		{
			data:
			{
				name,
				gameId,
			},
		});
	}
}
