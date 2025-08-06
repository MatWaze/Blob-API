import participationRepo from "../repositories/participationRepository/participationFactory.ts";

export async function addUserToTournamentAsync(userId: string, tournamentId: number)
{
	try
	{
		if (!userId || userId.trim().length === 0)
		{
			throw new Error("User ID is required");
		}

		if (!tournamentId || tournamentId <= 0)
		{
			throw new Error("Invalid tournament ID");
		}

		// Check if user is already in this tournament
		const existingParticipants = await participationRepo.getParticipantsByTournamentAsync(tournamentId);
		const alreadyParticipating = existingParticipants.some((p: any) => p.userId === userId);

		if (alreadyParticipating)
		{
			throw new Error("User is already participating in this tournament");
		}

		return await participationRepo.addUserToTournamentAsync(userId, tournamentId);
	}
	catch (error)
	{
		console.error(`Error adding user ${userId} to tournament ${tournamentId}:`, error);
		throw error;
	}
}

export async function removeUserFromTournamentAsync(userId: string, tournamentId: number)
{
	try
	{
		if (!userId || userId.trim().length === 0)
		{
			throw new Error("User ID is required");
		}

		if (!tournamentId || tournamentId <= 0)
		{
			throw new Error("Invalid tournament ID");
		}

		// Check if user is participating in this tournament
		const existingParticipants = await participationRepo.getParticipantsByTournamentAsync(tournamentId);
		const isParticipating = existingParticipants.some((p: any) => p.userId === userId);

		if (!isParticipating)
		{
			throw new Error("User is not participating in this tournament");
		}

		await participationRepo.removeUserFromTournamentAsync(userId, tournamentId);
	}
	catch (error)
	{
		console.error(`Error removing user ${userId} from tournament ${tournamentId}:`, error);
		throw error;
	}
}

export async function getParticipantsByTournamentAsync(tournamentId: number)
{
	try
	{
		if (!tournamentId || tournamentId <= 0)
		{
			throw new Error("Invalid tournament ID");
		}

		return await participationRepo.getParticipantsByTournamentAsync(tournamentId);
	}
	catch (error)
	{
		console.error(`Error getting participants for tournament ${tournamentId}:`, error);
		throw error;
	}
}

export async function setPlacementAsync(participationId: number, placementId: number)
{
	try
	{
		if (!participationId || participationId <= 0)
		{
			throw new Error("Invalid participation ID");
		}

		if (!placementId || placementId <= 0)
		{
			throw new Error("Invalid placement ID");
		}

		return await participationRepo.setPlacementAsync(participationId, placementId);
	}
	catch (error)
	{
		console.error(`Error setting placement ${placementId} for participation ${participationId}:`, error);
		throw error;
	}
}

export async function getUserTournamentsAsync(userId: string)
{
	try
	{
		if (!userId || userId.trim().length === 0)
		{
			throw new Error("User ID is required");
		}

		// This would require a new repository method, but showing the service structure
		throw new Error("Method not implemented - requires additional repository method");
	}
	catch (error)
	{
		console.error(`Error getting tournaments for user ${userId}:`, error);
		throw error;
	}
}

export async function getTournamentParticipationAsync(userId: string, tournamentId: number)
{
	try
	{
		if (!userId || userId.trim().length === 0)
		{
			throw new Error("User ID is required");
		}

		if (!tournamentId || tournamentId <= 0)
		{
			throw new Error("Invalid tournament ID");
		}

		// This would require a new repository method, but showing the service structure
		throw new Error("Method not implemented - requires additional repository method");
	}
	catch (error)
	{
		console.error(`Error getting participation for user ${userId} in tournament ${tournamentId}:`, error);
		throw error;
	}
}
