import { from, fromAsync } from "linq-to-typescript";
import prisma from "../../prisma/prismaInstance.ts";

export class TournamentRepository
{
	async getTournamentByIdAsync(id: number)
	{
		return await prisma.tournament.findUnique(
		{
			where: { id },
			include:
			{
				participations:
				{
					include:
					{
						user: true,
						placement: true,
					},
				},
				game: true,
			},
		});
	}

	async getAllTournamentsAsync()
	{
		return await prisma.tournament.findMany(
		{
			include:
			{
				game: true,
				participations: true
			},
		});
	}

	async getTournamentsByUserAsync(userId: string)
	{
		const tournaments = await prisma.tournament.findMany(
		{
			where:
			{
				participations:
				{
					some: { userId: userId }
				}
			},
			include:
			{
				game: true,
				participations:
				{
					where: { userId: userId },
					include: { placement: true }
				}
			},
			orderBy: { createdAt: 'desc' }
		});
		
		return tournaments;
	}

	async createTournamentAsync(gameId: number)
	{
		return await prisma.tournament.create(
		{
			data: { gameId },
		});
	}
}