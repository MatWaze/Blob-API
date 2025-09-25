import placementRepo from "../repositories/placementRepository/placementFactory.ts";

const MAX_LENGTH: number = 14

export async function getPlacementsByGameAsync(gameId: number)
{
	try
	{
		if (!gameId || gameId <= 0)
		{
			throw new Error("Invalid game ID");
		}

		return await placementRepo.getPlacementsByGameAsync(gameId);
	}
	catch (error)
	{
		console.error(`Error getting placements for game ${gameId}:`, error);
		throw error;
	}
}

export async function createPlacementAsync(gameId: number, name: string)
{
	try
	{
		if (!gameId || gameId <= 0)
		{
			throw new Error("Invalid game ID");
		}

		if (!name || name.trim().length === 0)
		{
			throw new Error("Placement name is required");
		}

		// Check if placement with this name already exists for this game
		const existingPlacements = await placementRepo.getPlacementsByGameAsync(gameId);
		const nameExists = existingPlacements.some((placement: any) => 
			placement.name.toLowerCase() === name.trim().toLowerCase()
		);

		if (nameExists)
		{
			throw new Error("Placement with this name already exists for this game");
		}

		return await placementRepo.createPlacementAsync(gameId, name.trim());
	}
	catch (error)
	{
		console.error(`Error creating placement "${name}" for game ${gameId}:`, error);
		throw error;
	}
}

export async function createDefaultPlacementsAsync(gameId: number, gameName: string)
{
	try
	{
		let defaultPlacements = [];

		switch (gameName)
		{
			case "Pong":
			const placementNames = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];

			for (let i = 0; i < placementNames.length; i++)
			{
				const placement = await createPlacementAsync(gameId, placementNames[i]);
				defaultPlacements.push(placement);
			}

		}

		return defaultPlacements;
	}
	catch (error)
	{
		console.error(`Error creating default placements for game ${gameId}:`, error);
		throw error;
	}
}

export async function getPlacementCountAsync(gameId: number): Promise<number>
{
	try
	{
		const placements = await getPlacementsByGameAsync(gameId);
		return placements.length;
	}
	catch (error)
	{
		console.error(`Error getting placement count for game ${gameId}:`, error);
		throw error;
	}
}
