import { isMainThread, parentPort, workerData } from 'worker_threads';
import { calculatePlayerPositions, checkCollisions, GameState } from '../services/workerService.ts';

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
				const randomAngle = Math.random() * 2 * Math.PI;
				const speed = 0.5;
				game.ballVelocity = [Math.cos(randomAngle) * speed, Math.sin(randomAngle) * speed];
				console.log('Game transitioned to playing state');
			}
			return;
		}
		else if (game.state === 'playing')
		{
			const collisionOrGoal = checkCollisions(gameState, parentPort);
			
			if (!collisionOrGoal && game.state === 'playing')
			{
				const dt = 1 / 60;
				game.ballPosition[0] += game.ballVelocity[0] * dt;
				game.ballPosition[1] += game.ballVelocity[1] * dt;
			}
		}
	}

	calculatePlayerPositions(gameState);

	// 60 FPS game loop
	const gameLoop = setInterval(() =>
	{
		try
		{
			if (!isRunning)
			{
				clearInterval(gameLoop);
				return;
			}

			calculatePlayerPositions(gameState);
			updatePhysics(gameState);

			if (parentPort)
			{
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
	}, 1000 / 60);

	parentPort?.on('message', (message) =>
	{
		try
		{
			console.log('Game worker received message:', message);

			if (message.type === 'playerMoveRelative')
			{
				const player = gameState.players.find(p => p.id === message.playerId);

				if (player && player.isActive)
				{
					const scaledDelta = message.delta * MOUSE_SENSITIVITY;
					const tempPos = player.position + scaledDelta;

					const sidePercent = 0.1;
					player.position = Math.max(sidePercent, Math.min(1.0 - sidePercent, tempPos));

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