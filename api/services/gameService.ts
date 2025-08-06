import { GameRepository } from "../repositories/gameRepository/gameRepository.ts";
import gameRepo from "../repositories/gameRepository/gameFactory.ts";

export async function getAllGamesAsync()
{
	try
	{
		return await gameRepo.getAllGamesAsync();
	}
	catch (error)
	{
		console.error("Error getting all games:", error);
		throw new Error("Failed to retrieve games");
	}
}

export async function getGameByIdAsync(id: number)
{
	try
	{
		if (!id || id <= 0)
		{
			throw new Error("Invalid game ID");
		}

		const game = await gameRepo.getGameByIdAsync(id);
		if (!game)
		{
			throw new Error("Game not found");
		}

		return game;
	}
	catch (error)
	{
		console.error(`Error getting game by ID ${id}:`, error);
		throw error;
	}
}

export async function createGameAsync(name: string)
{
	try
	{
		if (!name || name.trim().length === 0)
		{
			throw new Error("Game name is required");
		}

		// Check if game with this name already exists
		const existingGames = await gameRepo.getAllGamesAsync();
		const nameExists = existingGames.some(game => 
			game.name.toLowerCase() === name.trim().toLowerCase()
		);

		if (nameExists)
		{
			throw new Error("Game with this name already exists");
		}

		return await gameRepo.createGameAsync(name.trim());
	}
	catch (error)
	{
		console.error(`Error creating game with name "${name}":`, error);
		throw error;
	}
}

export async function gameExistsAsync(id: number): Promise<boolean>
{
	try
	{
		const game = await gameRepo.getGameByIdAsync(id);
		return game !== null;
	}
	catch (error)
	{
		console.error(`Error checking if game exists with ID ${id}:`, error);
		return false;
	}
}

export async function getGameCountAsync(): Promise<number>
{
	try
	{
		const games = await gameRepo.getAllGamesAsync();
		return games.length;
	}
	catch (error)
	{
		console.error("Error getting game count:", error);
		throw new Error("Failed to get game count");
	}
}
