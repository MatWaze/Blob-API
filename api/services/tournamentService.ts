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
		throw error;
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
		throw new Error("Failed to retrieve tournaments");
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
		throw error;
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
		throw error;
	}
}

export async function getTournamentCountAsync(): Promise<number>
{
	try
	{
		const tournaments = await tournamentRepo.getAllTournamentsAsync();
		return tournaments.length;
	}
	catch (error)
	{
		console.error("Error getting tournament count:", error);
		throw new Error("Failed to get tournament count");
	}
}

export async function getTournamentParticipantCountAsync(tournamentId: number): Promise<number>
{
	try
	{
		const tournament = await getTournamentByIdAsync(tournamentId);
		return tournament.participations.length;
	}
	catch (error)
	{
		console.error(`Error getting participant count for tournament ${tournamentId}:`, error);
		throw error;
	}
}

export async function isTournamentFullAsync(tournamentId: number, maxParticipants: number = 8): Promise<boolean>
{
	try
	{
		const participantCount = await getTournamentParticipantCountAsync(tournamentId);
		return participantCount >= maxParticipants;
	}
	catch (error)
	{
		console.error(`Error checking if tournament ${tournamentId} is full:`, error);
		throw error;
	}
}
