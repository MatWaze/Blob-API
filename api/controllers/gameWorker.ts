import { isMainThread, parentPort, workerData } from 'worker_threads';

if (!isMainThread)
{
	console.log('Game worker starting with data:', JSON.stringify(workerData, null, 2));
	
	// Add error handling for the entire worker
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

	interface GamePlayer
	{
		id: string;
		username: string;
		position: number;
		x: number;
		y: number;
		isActive: boolean;
		place: number | string | undefined,
		playersKicked: number
	}

	interface GameState
	{
		roomId: string;
		state: 'countdown' | 'playing' | 'finished';
		ballPosition: [number, number];
		ballVelocity: [number, number];
		players: GamePlayer[];
		countdownSeconds: number;
		whoHitTheBall: GamePlayer
	}

	if (!workerData || !workerData.initialState)
	{
		console.error('Game worker: No initial state provided');
		process.exit(1);
	}

	let gameState: GameState = workerData.initialState;
	let isRunning = true;

	const MOUSE_SENSITIVITY = 0.001;
	const PADDLE_SIDE_PERCENT = 0.1;

	console.log(`Game worker initialized for room ${gameState.roomId} with ${gameState.players.length} players`);

	function calculatePlayerPositions()
	{
		try
		{
			const activePlayers = gameState.players.filter(p => p.isActive);
			const playerCount = activePlayers.length;

			if (playerCount === 0)
			{
				console.log('No active players to position');
				return;
			}

			const alpha = (Math.PI * 2) / playerCount;
			const height = 0.5 / (Math.tan(alpha / 2));
			
			activePlayers.forEach((player, arrayIndex) =>
			{
				const distance = player.position - 0.5;
				const beta = alpha * arrayIndex;
				const gamma = beta - (Math.PI / 2);

				const distance_x = distance * Math.cos(beta);
				const distance_y = distance * Math.sin(beta);

				const x_center = height * Math.cos(gamma);
				const y_center = height * Math.sin(gamma);

				player.x = x_center + distance_x;
				player.y = y_center + distance_y;

				// console.log(`playerIndex: ${arrayIndex}, pos: ${player.position}, x: ${player.x}, y: ${player.y}`);
			});
		}
		catch (error)
		{
			console.error('Error in calculatePlayerPositions:', error);
		}
	}

	function reflectBall(normal: [number, number])
	{
		const [vx, vy] = gameState.ballVelocity;
		const [nx, ny] = normal;

		const dot = vx * nx + vy * ny;
		gameState.ballVelocity = [
			vx - 2 * dot * nx,
			vy - 2 * dot * ny
		];
	}

	function checkCollisions()
	{
		const players = gameState.players.filter(p => p.isActive);
		if (players.length < 2) return false;

		const ball = gameState.ballPosition;
		const dt = 1 / 60;
		const nextBall =
		[
			ball[0] + gameState.ballVelocity[0] * dt,
			ball[1] + gameState.ballVelocity[1] * dt
		];

		const aCoeff = nextBall[1] - ball[1];
		const bCoeff = -(nextBall[0] - ball[0]);
		const cConst = (nextBall[0] * ball[1]) - (ball[0] * nextBall[1]);

		const activePlayers = gameState.players.filter(p => p.isActive);
		const playerCount = activePlayers.length;
		const alpha = (Math.PI * 2) / playerCount;

		let collisionOrGoalOccurred = false;

		for (let i = 0; i < activePlayers.length; i++)
		{
			const player = activePlayers[i];
			const beta = alpha * i;

			const playerRightBorder =
			[
				player.x + PADDLE_SIDE_PERCENT * Math.cos(beta),
				player.y + PADDLE_SIDE_PERCENT * Math.sin(beta)
			];

			const playerLeftBorder =
			[
				player.x - PADDLE_SIDE_PERCENT * Math.cos(beta),
				player.y - PADDLE_SIDE_PERCENT * Math.sin(beta)
			];

			const playerAcoeff = playerRightBorder[1] - playerLeftBorder[1];
			const playerBcoeff = -(playerRightBorder[0] - playerLeftBorder[0]);
			const playerCcoeff = (playerRightBorder[0] * playerLeftBorder[1]) - (playerLeftBorder[0] * playerRightBorder[1]);

			const det = aCoeff * playerBcoeff - playerAcoeff * bCoeff;

			if (Math.abs(det) < 1e-6)
				continue;

			const ix = (-cConst * playerBcoeff - (-playerCcoeff) * bCoeff) / det;
			const iy = (aCoeff * (-playerCcoeff) - playerAcoeff * (-cConst)) / det;

			// Check if the intersection point is within the ball's path segment
			let t;
			const dx = nextBall[0] - ball[0];
			const dy = nextBall[1] - ball[1];
	
			if (Math.abs(dx) > 1e-6)
				t = (ix - ball[0]) / dx;
			else if (Math.abs(dy) > 1e-6)
				t = (iy - ball[1]) / dy;
			else
				continue;

			if (t >= 0 && t <= 1)
			{
				// Check if the intersection point is within the player's paddle segment
				const paddleVecX = playerRightBorder[0] - playerLeftBorder[0];
				const paddleVecY = playerRightBorder[1] - playerLeftBorder[1];
				const paddleSegmentLengthSq = paddleVecX * paddleVecX + paddleVecY * paddleVecY;
				
				let u;
				if (paddleSegmentLengthSq > 1e-9) // Check if paddle has length
					u = (paddleVecX * (ix - playerLeftBorder[0]) + paddleVecY * (iy - playerLeftBorder[1])) / paddleSegmentLengthSq;
				else
				{
					// Paddle has no length, treat as a point. Check if intersection is at the point.
					const distSq = (ix - player.x)**2 + (iy - player.y)**2;
					u = (distSq < (PADDLE_SIDE_PERCENT * PADDLE_SIDE_PERCENT)) ? 0.5 : -1;
				}
				
				if (u >= 0 && u <= 1)
				{
					const normal: [number, number] = [playerAcoeff, playerBcoeff];
					const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1]);
					if (length > 0)
					{
						normal[0] /= length;
						normal[1] /= length;
					}
					
					// Ensure normal points towards the center (0,0)
					const dotProductWithCenter = normal[0] * ix + normal[1] * iy;
					if (dotProductWithCenter > 0)
					{
						normal[0] *= -1;
						normal[1] *= -1;
					}

					reflectBall(normal);

					// Move ball to point of impact to prevent passing through
					gameState.ballPosition[0] = ix;
					gameState.ballPosition[1] = iy;
					gameState.whoHitTheBall = player;

					collisionOrGoalOccurred = true;

					break; // Collision detected, stop checking for this frame
				}
				else
				{
					console.log(`Player ${player.username} was scored on!`);
					player.place = players.length.toString();
					player.isActive = false;

					if (gameState.whoHitTheBall)
					{
						const scorer = gameState.players.find(p => p.id === gameState.whoHitTheBall.id);
						if (scorer)
							scorer.playersKicked++;
					}

					const remainingPlayers = gameState.players.filter(p => p.isActive);
					if (remainingPlayers.length < 2)
					{
						player.place = '1';
						gameState.state = 'finished';

						if (parentPort)
						{
							parentPort.postMessage({
								type: 'gameFinished',
								roomId: gameState.roomId,
								gameResult:
								{
									players: gameState.players.map(p => ({
										id: p.id,
										username: p.username,
										place: p.place,
										playersKicked: p.playersKicked,
										isActive: p.isActive
									})),
									state: 'finished'
								}
							});
						}
					}
					else
					{
						gameState.state = 'countdown';
						gameState.countdownSeconds = 5;
						gameState.ballPosition = [0, 0];
					}
					collisionOrGoalOccurred = true; // A goal is a type of "collision" that stops the play
					break; // Goal scored, stop checking for this frame
				}
			}
		}

		return collisionOrGoalOccurred;
	}

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
		}
		else if (game.state === 'playing')
		{
			const collisionOrGoal = checkCollisions();
			
			if (!collisionOrGoal && game.state === 'playing')
			{
				const dt = 1 / 60;
				game.ballPosition[0] += game.ballVelocity[0] * dt;
				game.ballPosition[1] += game.ballVelocity[1] * dt;
			}
		}
	}

	calculatePlayerPositions();

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

			calculatePlayerPositions();
			updatePhysics(gameState);

			if (parentPort)
			{
				parentPort.postMessage(
				{
					type: 'gameState',
					roomId: gameState.roomId,
					state: gameState
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

					// Clamp the position to ensure the paddle stays within the side boundaries.
					// The valid range for the center of the paddle is [sidePercent, 1.0 - sidePercent].
					const sidePercent = 0.1;
					player.position = Math.max(sidePercent, Math.min(1.0 - sidePercent, tempPos));
					
					console.log(`Player ${player.id}: position += ${scaledDelta.toFixed(4)} = ${player.position.toFixed(4)}`);
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