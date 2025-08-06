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
			},
		});
	}

	async createTournamentAsync(gameId: number)
	{
		return await prisma.tournament.create(
		{
			data: { gameId },
		});
	}
}