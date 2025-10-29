import { isMainThread, parentPort, workerData } from 'worker_threads';
import { calculatePlayerPositions, checkCollisions } from '../services/workerService.ts';
// import { GameState } from '../models/gameModels.ts';
import game_config from "../game_config.json" with { type: 'json' };

interface GamePlayer
{
	id: string;
	username: string;
	position: number;
	x: number;
	y: number;
	isActive: boolean;
	place: string,
	playersKicked: number
	prevX?: number,
	prevY?: number;
	velocityX?: number;
	velocityY?: number;
}

interface GameState
{
	roomId: string;
	state: 'countdown' | 'playing' | 'finished';
	ballPosition: [number, number];
	ballVelocity: [number, number];
	players: GamePlayer[];
	countdownSeconds: number;
	whoHitTheBall: GamePlayer | undefined
}

const playerMoveTimestamps: Record<string, number> = {};
const MOVE_RATE_LIMIT_MS = 16;

if (!isMainThread)
{
	console.log('Game worker starting with data:', JSON.stringify(workerData, null, 2));
	
	process.on('uncaughtException', (error) =>
	{
		console.error('Game worker uncaught exception:', error);
		process.exit(1);
	});

	process.on('unhandledRejection', (reason, promise) =>
	{
		console.error('Game worker unhandled rejection at:', promise, 'reason:', reason);
		process.exit(1);
	});

	if (!workerData || !workerData.initialState)
	{
		console.error('Game worker: No initial state provided');
		process.exit(1);
	}

	let gameState: GameState = workerData.initialState;
	let isRunning = true;
	const fee = workerData.fee;

	const MOUSE_SENSITIVITY = 0.001;

	console.log(`Game worker initialized for room ${gameState.roomId} with ${gameState.players.length} players`);

	function updatePhysics(game: GameState)
	{
		if (game.state === 'countdown')
		{
			game.countdownSeconds -= 1 / 60;
			if (game.countdownSeconds <= 0)
			{
				game.state = 'playing';
				const acuteRanges = [
					(Math.random() - 0.5) * (Math.PI / 2), // -π/4 to +π/4
					Math.PI + (Math.random() - 0.5) * (Math.PI / 2) // 3π/4 to 5π/4
				];
				const randomAngle = game_config.angle;
				const speed = game_config.speed;
				game.ballVelocity = [Math.cos(randomAngle) * speed, Math.sin(randomAngle) * speed];
				console.log('Game transitioned to playing state');
			}
			return;
		}
		else if (game.state === 'playing')
		{
			const collisionOrGoal = checkCollisions(gameState, parentPort);
			
			if (!collisionOrGoal)
			{
				const dt = 1 / 60;
				game.ballPosition[0] += game.ballVelocity[0] * dt;
				game.ballPosition[1] += game.ballVelocity[1] * dt;
			}
		}
	}

	//calculatePlayerPositions(gameState);

	const gameLoop = setInterval(() =>
	{
		try
		{
			if (!isRunning)
			{
				clearInterval(gameLoop);
				return;
			}

			if (parentPort)
			{
				calculatePlayerPositions(gameState);
				updatePhysics(gameState);

				//console.log(`x: ${gameState.players[1].x}, y: ${gameState.players[1].y}`);
				parentPort.postMessage(
				{
					type: 'gameState',
					roomId: gameState.roomId,
					state: {
						...gameState,
						players: gameState.players.map(p => ({
							id: p.id,
							username: p.username,
							position: p.position,
							isActive: p.isActive,
							place: p.place,
							playersKicked: p.playersKicked
						})),
						fee: fee
					},
				});
			}
		}
		catch (error)
		{
			console.error('Error in game loop:', error);
			isRunning = false;
			clearInterval(gameLoop);
		}
	}, 1000 / game_config.fps);

	parentPort?.on('message', (message) =>
	{
		try
		{
			// console.log('Game worker received message:', message);
			// Problem when user logs out when he's in the room
			if (message.type === 'playerMoveRelative' && message.delta !== 0)
			{
				const now = Date.now();
				const playerId = message.playerId;
				const lastMove = playerMoveTimestamps[playerId] || 0;

				if (now - lastMove < MOVE_RATE_LIMIT_MS)
					return;

				playerMoveTimestamps[playerId] = now;

				const player = gameState.players.find(p => p.id === playerId);
				if (player && player.isActive)
				{
					const tempPos = player.position + message.delta;
					const sidePercent = 0.1;

					player.position = Math.max(sidePercent, Math.min(0.9, tempPos));

					// console.log(`Player ${player.id}: position += ${scaledDelta.toFixed(4)} = ${player.position.toFixed(4)}`);
				}
			}
			else if (message.type === 'stop')
			{
				console.log('Game worker stopping...');
				isRunning = false;
				clearInterval(gameLoop);
				process.exit(0);
			}
		}
		catch (error)
		{
			console.error('Error handling message:', error);
		}
	});

	console.log('Game worker started successfully');
}