import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGameAsync, getAllGamesAsync } from './gameService.ts';
import { createDefaultPlacementsAsync, getPlacementsByGameAsync } from './placementService.ts';
import { createTournamentAsync } from './tournamentService.ts';
import { addUserToTournamentAsync, setPlacementAsync } from './participationService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GameResult
{
	players: Array<{
		id: string;
		username: string;
		place: number;
		playersKicked: number;
		isActive: boolean;
	}>;
	state: 'finished' | 'aborted';
}

interface GameWorkerData
{
	worker: Worker;
	roomId: string;
	players: Array<{id: string, username: string}>;
	createdAt: Date;
}

const gameWorkers = new Map<string, GameWorkerData>();

export function createGame(roomId: string, players: Array<{id: string, username: string}>): boolean
{
	// stopGame(roomId);

	try
	{
		const initialGameState =
		{
			roomId,
			state: 'countdown',
			ballPosition: [0, 0] as [number, number],
			players: players.map((player) =>
			({
				id: player.id,
				username: player.username,
				position: 0.5,
				// x: 0,
				// y: 0,
				isActive: true,
				place: undefined,
				playersKicked: 0,
			})),
			countdownSeconds: 5,
		};

		const workerPath = path.join(__dirname, '..', 'controllers', 'gameWorker.js');
		console.log('Creating worker with path:', workerPath);

		const worker = new Worker(workerPath,
		{
			workerData: { initialState: initialGameState }
		});

		worker.on('error', (error) =>
		{
			console.error(`Worker error for room ${roomId}:`, error);
		});

		worker.on('exit', (code) =>
		{
			console.error(`Worker stopped with exit code ${code} for room ${roomId}`);
			gameWorkers.delete(roomId);
		});

		gameWorkers.set(roomId,
		{
			worker,
			roomId,
			players,
			createdAt: new Date()
		});

		console.log(`Game worker created for room ${roomId} with ${players.length} players`);
		return true;
	}
	catch (error)
	{
		console.error(`Failed to create game worker for room ${roomId}:`, error);
		return false;
	}
}

//<summary>
// Get drag value from a user
//</summary>
export function updatePlayerPositionRelative(roomId: string, playerId: string, dragDelta: number): boolean
{
	const gameData = gameWorkers.get(roomId);

	if (!gameData)
	{
		return false;
	}

	// Send message to a worker
	gameData.worker.postMessage(
	{
		type: 'playerMoveRelative',
		playerId,
		delta: dragDelta
	});

	return true;
}

export async function stopGame(roomId: string, gameResult: GameResult): Promise<boolean>
{
	const gameData = gameWorkers.get(roomId);
	if (!gameData) return false;

	try
	{
		if (gameResult && gameResult.state === "finished")
			await saveGameResults(roomId, gameResult);

		gameData.worker.postMessage({ type: 'stop' });
		console.log(`Game worker stopped for room ${roomId}`);
	}
	catch (error)
	{
		console.error(`Error stopping worker for room ${roomId}:`, error);
	}
	
	// gameWorkers.delete(roomId);
	return true;
}

export function getGameWorker(roomId: string): Worker | undefined
{
	return gameWorkers.get(roomId)?.worker;
}

export function getActiveGames(): string[]
{
	return Array.from(gameWorkers.keys());
}

export function isGameActive(roomId: string): boolean
{
	return gameWorkers.has(roomId);
}

async function saveGameResults(roomId: string, gameResult: GameResult) : Promise<void>
{
	try
	{
		let pongGame;
		const existingGames = await getAllGamesAsync();
		pongGame = existingGames.find(game => game.name.toLowerCase() === "pong");

		if (!pongGame)
		{
			pongGame = await createGameAsync("Pong");

			await createDefaultPlacementsAsync(pongGame.id);
		}

		const tournament = await createTournamentAsync(pongGame.id);

		if (!tournament)
		{
			console.error('Failed to create tournament for game results');
			return;
		}

		const placements = await getPlacementsByGameAsync(pongGame.id);

		if (!placements || placements.length === 0)
		{
			console.error('No placements found for game');
			return;
		}

		for (const player of gameResult.players)
		{
			const participation = await addUserToTournamentAsync(player.id, tournament.id);

			const placement = placements
				.find(p => p.name === player.place.toString());

			if (placement)
				setPlacementAsync(participation.id, placement.id);
		}
	}
	catch(error)
	{
		console.error('Error saving game results:', error);
	}
}

// // Clean up inactive games periodically
// setInterval(() =>
// {
// 	const now = new Date();
// 	for (const [roomId, gameData] of gameWorkers)
// 	{
// 		const timeDiff = now.getTime() - gameData.createdAt.getTime();
// 		const maxGameTime = 30 * 60 * 1000;

// 		if (timeDiff > maxGameTime)
// 		{
// 			console.log(`Auto-stopping long-running game in room ${roomId}`);
// 			stopGame(roomId);
// 		}
// 	}
// }, 5 * 60 * 1000); // Check every 5 minutes