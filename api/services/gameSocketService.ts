import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGameAsync, getAllGamesAsync } from './gameService.ts';
import { createDefaultPlacementsAsync, getPlacementsByGameAsync } from './placementService.ts';
import { createTournamentAsync } from './tournamentService.ts';
import { addUserToTournamentAsync, setPlacementAsync } from './participationService.ts';
import { GameResult, GameWorkerData } from '../models/gameModels.ts';
import { getRoomFee, getUserCurrentRoom, rooms, userRoomMapping } from './roomService.ts';
import { StringDecoder } from "string_decoder";
import { TemplatedApp } from '@geut/fastify-uws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gameWorkers = new Map<string, GameWorkerData>();

export function createGame(app: TemplatedApp, roomId: string, players: Array<{id: string, username: string}>): boolean
{
	// stopGame(roomId);

	try
	{
		const initialGameState =
		{
			roomId,
			state: 'countdown',
			ballPosition: [0, 0],
			players: players.map((player) =>
			({
				id: player.id,
				username: player.username,
				position: 0.5,
				isActive: true,
				place: undefined,
				playersKicked: 0,
			})),
			countdownSeconds: 3,
		};

		app.publish(`game69:${roomId}`, JSON.stringify(initialGameState));
		const workerPath = path.join(__dirname, '..', 'controllers', 'gameWorker.ts');
		console.log('Creating worker with path:', workerPath);

		const worker = new Worker(workerPath,
		{
			workerData:
			{
				initialState: initialGameState,
				fee: getRoomFee(roomId)
			},
			execArgv: ['--import', 'tsx', '--no-warnings']
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
export function updatePlayerPositionRelative(
	userId: string,
	data: any
) : boolean
{
	const roomId = getUserCurrentRoom(userId);

	if (roomId)
	{
		// Server does this check just in case
		if (!isGameActive(roomId))
		{
			console.log(`Player ${userId} tried to send input but no active game in room ${roomId}`);
			return false;
		}

		const gameData = gameWorkers.get(roomId);

		if (!gameData)
			return false;

		const drag : number = parseFloat(data.dragValue);

		// Send message to a worker
		gameData.worker.postMessage(
		{
			type: 'playerMoveRelative',
			playerId: userId,
			delta: drag
		});

		return true;
	}

	return false;
}

export async function stopGame(roomId: string, gameResult: GameResult): Promise<boolean>
{
	const gameData = gameWorkers.get(roomId);
	if (!gameData) return false;

	try
	{
		if (gameResult && gameResult.state === "finished")
			await saveGameResults(gameResult);

		gameWorkers.delete(roomId);
		gameData.worker.postMessage({ type: 'stop' });

		// removing room and players when the game is over
		rooms.delete(roomId);
		gameResult.players.forEach(p =>
		{
			userRoomMapping.delete(p.id);
		});
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

async function saveGameResults(gameResult: GameResult) : Promise<void>
{
	try
	{
		let pongGame;
		let placements;

		const existingGames = await getAllGamesAsync();
		pongGame = existingGames?.find(game => game.name.toLowerCase() === "pong");

		if (!pongGame)
		{
			pongGame = await createGameAsync("Pong");
			placements = await createDefaultPlacementsAsync(pongGame!.id, "Pong");
		}

		const tournament = await createTournamentAsync(pongGame!.id);

		if (!tournament)
		{
			console.error('Failed to create tournament for game results');
			return;
		}

		placements = await getPlacementsByGameAsync(pongGame!.id);

		if (!placements || placements.length === 0)
		{
			console.error('No placements found for game');
			return;
		}

		console.log(`fee: ${gameResult.fee}, len: ${gameResult.players.length}`);
		calculateAllPlayerScores(gameResult, gameResult.fee * gameResult.players.length);

		for (const player of gameResult.players)
		{
			const participation = await addUserToTournamentAsync(player.id, tournament.id);

			const placement = placements
				.find(p => p.name === player.place.toString());

			if (placement)
				setPlacementAsync(participation!.id, placement.id);
		}
	}
	catch(error)
	{
		console.error('Error saving game results:', error);
	}
}

function distributeForTwoPlayers(gameResult: GameResult, rankPrizePool: number)
{
	const firstPct = 0.90;
	const secondPct = 0.10;

	for (const player of gameResult.players)
	{
		const placeInt = +player.place;
		let playerRankPrize = 0;
		if (placeInt === 1) playerRankPrize = rankPrizePool * firstPct;
		else if (placeInt === 2) playerRankPrize = rankPrizePool * secondPct;
		player.score = Math.round(playerRankPrize);
		console.log(`player ${player.username} got ${player.score}`);
	}
}

function distributeForThreePlayers(gameResult: GameResult, rankPrizePool: number)
{
	const firstPct = 0.85;
	const secondPct = 0.10;
	const thirdPct = 0.05;

	for (const player of gameResult.players)
	{
		const placeInt = +player.place;
		let playerRankPrize = 0;
		if (placeInt === 1) playerRankPrize = rankPrizePool * firstPct;
		else if (placeInt === 2) playerRankPrize = rankPrizePool * secondPct;
		else if (placeInt === 3) playerRankPrize = rankPrizePool * thirdPct;
		player.score = Math.round(playerRankPrize);
		console.log(`player ${player.username} got ${player.score}`);
	}
}

function distributeForFourPlus(gameResult: GameResult, rankPrizePool: number)
{
	const tailPlayers = gameResult.players.filter(p => +p.place >= 4);
	const tailPrizePool = rankPrizePool * 0.20;
	const totalPlayers = gameResult.players.length;
	const totalTailWeight = computeTotalTailWeight(tailPlayers, totalPlayers);

	for (const player of gameResult.players)
	{
		let playerRankPrize = 0;
		const placeInt = +player.place;

		if (placeInt === 1)
			playerRankPrize = rankPrizePool * 0.70;
		else if (placeInt === 2)
			playerRankPrize = rankPrizePool * 0.15;
		else if (placeInt === 3)
			playerRankPrize = rankPrizePool * 0.05;
		else if (placeInt >= 4)
		{
			const playerWeight = totalPlayers - placeInt + 1;
			const playerTailFraction = totalTailWeight > 0 ? playerWeight / totalTailWeight : 0;
			playerRankPrize = tailPrizePool * playerTailFraction;
		}

		player.score = Math.round(playerRankPrize);
		console.log(`player ${player.username} got ${player.score}`);
	}
}

function computeTotalTailWeight(tailPlayers: Array<{ place: string }>, totalPlayers: number): number
{
	let totalTailWeight = 0;
	for (const tailPlayer of tailPlayers)
	{
		const n = +tailPlayer.place;
		totalTailWeight += (totalPlayers - n + 1);
	}
	return totalTailWeight;
}

function calculateAllPlayerScores(gameResult: GameResult, totalPrizePool: number = 1000): void
{
	const totalPlayers = gameResult.players.length;
	console.log(`totalPlayers: ${totalPlayers}`);

	const rankPrizePool = totalPrizePool;
	const kicksPrizePool = 0; // reserved for future use

	console.log(`rankPrizePool: ${rankPrizePool}`);
	console.log(`kicksPrizePool: ${kicksPrizePool}`);

	if (totalPlayers === 2)
	{
		distributeForTwoPlayers(gameResult, rankPrizePool);
		return;
	}

	if (totalPlayers === 3)
	{
		distributeForThreePlayers(gameResult, rankPrizePool);
		return;
	}

	// 4+ players
	distributeForFourPlus(gameResult, rankPrizePool);
}
// // Clean up inactive games periodically
// setInterval(()
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