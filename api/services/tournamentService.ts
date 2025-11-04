import tournamentRepo from "../repositories/tournamentRepository/tournamentFactory.ts";

export async function getTournamentByIdAsync(id: number)
{
	try
	{
		if (!id || id <= 0)
		{
			throw new Error("Invalid tournament ID");
		}

		const tournament = await tournamentRepo.getTournamentByIdAsync(id);
		if (!tournament)
		{
			throw new Error("Tournament not found");
		}

		return tournament;
	}
	catch (error)
	{
		console.error(`Error getting tournament by ID ${id}:`, error);
	}
}

export async function getAllTournamentsAsync()
{
	try
	{
		return await tournamentRepo.getAllTournamentsAsync();
	}
	catch (error)
	{
		console.error("Error getting all tournaments:", error);
	}
}

export async function createTournamentAsync(gameId: number)
{
	try
	{
		if (!gameId || gameId <= 0)
		{
			throw new Error("Invalid game ID");
		}

		return await tournamentRepo.createTournamentAsync(gameId);
	}
	catch (error)
	{
		console.error(`Error creating tournament for game ${gameId}:`, error);
	}
}

export async function tournamentExistsAsync(id: number): Promise<boolean>
{
	try
	{
		const tournament = await tournamentRepo.getTournamentByIdAsync(id);
		return tournament !== null;
	}
	catch (error)
	{
		console.error(`Error checking if tournament exists with ID ${id}:`, error);
		return false;
	}
}

export async function getTournamentsByGameAsync(gameId: number)
{
	try
	{
		if (!gameId || gameId <= 0)
		{
			throw new Error("Invalid game ID");
		}

		const allTournaments = await tournamentRepo.getAllTournamentsAsync();
		return allTournaments.filter((tournament: any) => tournament.gameId === gameId);
	}
	catch (error)
	{
		console.error(`Error getting tournaments for game ${gameId}:`, error);
	}
}

export async function getTournamentCountAsync()
{
	try
	{
		const tournaments = await tournamentRepo.getAllTournamentsAsync();
		return tournaments.length;
	}
	catch (error)
	{
		console.error("Error getting tournament count:", error);
	}
}

export async function getTournamentParticipantCountAsync(tournamentId: number)
{
	try
	{
		const tournament = await getTournamentByIdAsync(tournamentId);
		return tournament!.participations.length;
	}
	catch (error)
	{
		console.error(`Error getting participant count for tournament ${tournamentId}:`, error);
	}
}

export async function getTournamentsByUser(userId: string)
{
	try
	{
		const lastWeekDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
		return (await tournamentRepo.getTournamentsByUserAsync(userId))
			.filter(t => t.createdAt >= lastWeekDate)
			.map(t =>
			({
				id: t.id,
				createdAt: t.createdAt,
				gameName: t.game.name,
				placementName: t.participations[0]?.placement?.name || 'N/A'
			}));;
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function isTournamentFullAsync(tournamentId: number, maxParticipants: number = 8)
{
	try
	{
		const participantCount = await getTournamentParticipantCountAsync(tournamentId);
		return participantCount! >= maxParticipants;
	}
	catch (error)
	{
		console.error(`Error checking if tournament ${tournamentId} is full:`, error);
	}
}
