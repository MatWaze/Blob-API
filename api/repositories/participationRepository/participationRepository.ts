import prisma from "../../prisma/prismaInstance.ts";

export class ParticipationRepository
{
	async addUserToTournamentAsync(userId: string, tournamentId: number)
	{
		return await prisma.participation.create(
		{
			data: {
				userId,
				tournamentId,
			},
		});
	}

	async removeUserFromTournamentAsync(userId: string, tournamentId: number)
	{
		await prisma.participation.deleteMany(
		{
			where: {
				userId,
				tournamentId,
			},
		});
	}

	async getParticipantsByTournamentAsync(tournamentId: number)
	{
		return await prisma.participation.findMany(
		{
			where: { tournamentId },
			include: {
				user: true,
				placement: true,
			},
		});
	}

	async setPlacementAsync(participationId: number, placementId: number)
	{
		return await prisma.participation.update(
		{
			where: { id: participationId },
			data: { placementId },
		});
	}
}