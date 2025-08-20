export 	interface GamePlayer
{
	id: string;
	username: string;
	position: number;
	x: number;
	y: number;
	isActive: boolean;
	place: string,
	playersKicked: number
}

export interface GameState
{
	roomId: string;
	state: 'countdown' | 'playing' | 'finished';
	ballPosition: [number, number];
	ballVelocity: [number, number];
	players: GamePlayer[];
	countdownSeconds: number;
	whoHitTheBall: GamePlayer
}

const PADDLE_SIDE_PERCENT = 0.1;

function calculateTwoPlayersPositions(players: GamePlayer[])
{
	const leftPlayer = players[0];
	const rightPlayer = players[1];

	const leftPlayerDist = leftPlayer.position - 0.5;
	const rightPlayerDist = rightPlayer.position - 0.5;

	// leftmost coordinate of the unit circle
	leftPlayer.y = leftPlayerDist;

	// rightmost
	rightPlayer.y = rightPlayerDist;
}

export function calculatePlayerPositions(gameState: GameState)
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

		if (activePlayers.length == 2)
		{
			if (!activePlayers[0].x)
				activePlayers[0].x = -1;
			if (!activePlayers[1].x)
				activePlayers[1].x = 1;
			calculateTwoPlayersPositions(activePlayers);
		}
		else
		{
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
	}
	catch (error)
	{
		console.error('Error in calculatePlayerPositions:', error);
	}
}

export function sendFinishedNotification(gameState: GameState, parentPort: any)
{
	if (parentPort)
	{
		gameState.players.forEach(p => {
			console.log(`username: ${p.username},place:${p.place}`);
		})
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
					isActive: p.isActive,
					score: 0
				})),
				state: 'finished'
			}
		});
	}
}

function getBallNextPosition(gameState: GameState): [number, number]
{
	const ball = gameState.ballPosition;
	const dt = 1 / 60;
	return [
		ball[0] + gameState.ballVelocity[0] * dt,
		ball[1] + gameState.ballVelocity[1] * dt
	];
}

function getPlayerBorders(player: GamePlayer, beta: number): [[number, number], [number, number]]
{
	return [
		[
			player.x + PADDLE_SIDE_PERCENT * Math.cos(beta),
			player.y + PADDLE_SIDE_PERCENT * Math.sin(beta)
		],
		[
			player.x - PADDLE_SIDE_PERCENT * Math.cos(beta),
			player.y - PADDLE_SIDE_PERCENT * Math.sin(beta)
		]
	];
}

function getIntersection(
	ball: [number, number], nextBall: [number, number],
	playerLeft: [number, number], playerRight: [number, number]
): { ix: number, iy: number, t: number } | null
{
	const aCoeff = nextBall[1] - ball[1];
	const bCoeff = -(nextBall[0] - ball[0]);
	const cConst = (nextBall[0] * ball[1]) - (ball[0] * nextBall[1]);

	const playerAcoeff = playerRight[1] - playerLeft[1];
	const playerBcoeff = -(playerRight[0] - playerLeft[0]);
	const playerCcoeff = (playerRight[0] * playerLeft[1]) - (playerLeft[0] * playerRight[1]);

	const det = aCoeff * playerBcoeff - playerAcoeff * bCoeff;
	if (Math.abs(det) < 1e-6) return null;

	const ix = (-cConst * playerBcoeff - (-playerCcoeff) * bCoeff) / det;
	const iy = (aCoeff * (-playerCcoeff) - playerAcoeff * (-cConst)) / det;

	const dx = nextBall[0] - ball[0];
	const dy = nextBall[1] - ball[1];
	let t;
	if (Math.abs(dx) > 1e-6)
		t = (ix - ball[0]) / dx;
	else if (Math.abs(dy) > 1e-6)
		t = (iy - ball[1]) / dy;
	else
		return null;

	if (t < 0 || t > 1) return null;
	return { ix, iy, t };
}

function isWithinPaddle(ix: number, iy: number, playerLeft: [number, number], playerRight: [number, number], player: GamePlayer): boolean
{
	const paddleVecX = playerRight[0] - playerLeft[0];
	const paddleVecY = playerRight[1] - playerLeft[1];
	const paddleSegmentLengthSq = paddleVecX * paddleVecX + paddleVecY * paddleVecY;
	let u;

	if (paddleSegmentLengthSq > 1e-9)
		u = (paddleVecX * (ix - playerLeft[0]) + paddleVecY * (iy - playerLeft[1])) / paddleSegmentLengthSq;
	else
	{
		const distSq = (ix - player.x) ** 2 + (iy - player.y) ** 2;
		u = (distSq < (PADDLE_SIDE_PERCENT * PADDLE_SIDE_PERCENT)) ? 0.5 : -1;
	}

	// u == 0 => the ball is at the left edge of the paddle
	// u == 1 => the ball is at the right edge of the paddle
	// u > 0 && u < 1 => the ball is in between the edges, that is inside the paddle
	// u < 0 || u > 1 => the ball is outside the paddle
	return u >= 0 && u <= 1;
}

function handlePaddleCollision(gameState: GameState, player: GamePlayer, ix: number, iy: number, playerAcoeff: number, playerBcoeff: number)
{
	const normal: [number, number] = [playerAcoeff, playerBcoeff];
	const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1]);
	if (length > 0)
	{
		normal[0] /= length;
		normal[1] /= length;
	}

	const dotProductWithCenter = normal[0] * ix + normal[1] * iy;
	if (dotProductWithCenter > 0)
	{
		normal[0] *= -1;
		normal[1] *= -1;
	}

	reflectBall(gameState, normal);

	gameState.ballPosition[0] = ix + normal[0] * 0.005;
	gameState.ballPosition[1] = iy + normal[1] * 0.005;
	gameState.whoHitTheBall = player;
	console.log(`player ${gameState.whoHitTheBall.username} hit the ball`);
}

function handleGoal(gameState: GameState, player: GamePlayer, players: GamePlayer[], parentPort: any)
{
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
		remainingPlayers[0].place = '1';
		console.log(`last player is ${remainingPlayers[0].username} with place ${remainingPlayers[0].place}`);
		gameState.state = 'finished';
		sendFinishedNotification(gameState, parentPort);
	}
	else
	{
		gameState.state = 'countdown';
		gameState.countdownSeconds = 5;
		gameState.ballPosition = [0, 0];
		gameState.ballVelocity = [0, 0];
	}
}

function checkTwoPlayerCollisions(gameState: GameState, nextBall: [number, number], parentPort: any): boolean
{
	const ball = gameState.ballPosition as [number, number];
	const players = gameState.players.filter(p => p.isActive);

	if (nextBall[1] <= -0.5 || nextBall[1] >= 0.5)
	{
		console.log(`Ball hit ${nextBall[1] <= -0.5 ? 'top' : 'bottom'} boundary`);

		gameState.ballVelocity[1] = -gameState.ballVelocity[1];
		
		if (nextBall[1] <= -0.5)
			gameState.ballPosition[1] = -0.5 + 0.005;
		else
			gameState.ballPosition[1] = 0.5 - 0.005;
		
		return true;
	}

	// Check if ball goes past left or right boundaries (goals)
	if (nextBall[0] <= -1.1 || nextBall[0] >= 1.1)
	{
		const scoredOnPlayer = nextBall[0] <= -1.1 ? players.find(p => p.x < 0) : players.find(p => p.x > 0);

		if (scoredOnPlayer)
		{
			console.log(`Ball went past ${nextBall[0] <= -1.1 ? 'left' : 'right'} boundary - goal!`);
			handleGoal(gameState, scoredOnPlayer, players, parentPort);
			return true;
		}
	}

	function lineSegmentsIntersect(p1: [number, number], p2: [number, number], q1: [number, number], q2: [number, number]): [number, number] | null {
    // p1-p2 is ball path, q1-q2 is paddle (vertical)
    const denom = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
    if (denom === 0) return null; // Parallel or coincident (unlikely for vertical paddle)

    const t = ((q1[0] - p1[0]) * (q2[1] - q1[1]) - (q1[1] - p1[1]) * (q2[0] - q1[0])) / denom;
    const u = ((q1[0] - p1[0]) * (p2[1] - p1[1]) - (q1[1] - p1[1]) * (p2[0] - p1[0])) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        // Intersection at p1 + t * (p2 - p1)
        return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
    }
    return null;
	}

	players.forEach(p =>
	{
		const paddleBottom: [number, number] = [p.x, p.y - PADDLE_SIDE_PERCENT];
		const paddleTop: [number, number] = [p.x, p.y + PADDLE_SIDE_PERCENT];

		console.log(`bottom: [x: ${paddleBottom[0]}, y: ${paddleBottom[1]}]`);
		console.log(`top: [x: ${paddleTop[0]}, y: ${paddleTop[1]}]`);
		console.log(`ball: [x: ${ball[0]}, y: ${ball[1]}]`);
		console.log(`nextBall: [x: ${nextBall[0]}, y: ${nextBall[1]}]`);

		const intersection = lineSegmentsIntersect(ball, nextBall, paddleBottom, paddleTop);

		if (intersection)
		{
			console.log(`Ball hit paddle at player x=${p.x}`);

			// Update ball position to intersection point (to avoid overshoot)
			gameState.ballPosition = intersection;

			// Reverse x-velocity (bounce)
			const normal: [number, number] = p.x < 0 ? [1, 0] : [-1, 0]; // Left paddle: face right; Right paddle: face left

			// Reflect ball velocity using the provided function
			reflectBall(gameState, normal);

			// Nudge to prevent re-collision
			if (gameState.ballVelocity[0] > 0)
				gameState.ballPosition[0] += 0.005; // Nudge right
			else
				gameState.ballPosition[0] -= 0.005; // Nudge left

			// Optional: Add y-velocity spin based on hit position
			// const relativeHit = (intersection[1] - p.y) / PADDLE_SIDE_PERCENT; // -1 to 1
			// gameState.ballVelocity[1] += relativeHit * 0.01; // Adjust spin factor as needed

			return true; // Collision handled
		}
	});
	
	return false;
}

export function checkCollisions(gameState: GameState, parentPort: any)
{
	// Only check collisions during playing state
	if (gameState.state !== 'playing') return false;
	
	const players = gameState.players.filter(p => p.isActive);
	if (players.length < 2) return false;

	const ball = gameState.ballPosition as [number, number];
	const nextBall = getBallNextPosition(gameState);

	// Use specialized 2-player collision detection for pong-style gameplay
	if (players.length === 2)
		return checkTwoPlayerCollisions(gameState, nextBall, parentPort);

	const activePlayers = players;
	const playerCount = activePlayers.length;
	const alpha = (Math.PI * 2) / playerCount;

	let collisionOrGoalOccurred = false;

	for (let i = 0; i < activePlayers.length; i++)
	{
		const player = activePlayers[i];
		const beta = alpha * i;
		const [playerRightBorder, playerLeftBorder] = getPlayerBorders(player, beta);

		const intersection = getIntersection(ball, nextBall, playerLeftBorder, playerRightBorder);
		if (!intersection) continue;

		const { ix, iy } = intersection;

		if (isWithinPaddle(ix, iy, playerLeftBorder, playerRightBorder, player))
		{
			const playerAcoeff = playerRightBorder[1] - playerLeftBorder[1];
			const playerBcoeff = -(playerRightBorder[0] - playerLeftBorder[0]);
			handlePaddleCollision(gameState, player, ix, iy, playerAcoeff, playerBcoeff);
			collisionOrGoalOccurred = true;
			break;
		}
		else
		{
			handleGoal(gameState, player, players, parentPort);
			collisionOrGoalOccurred = true;
			break;
		}
	}

	return collisionOrGoalOccurred;
}

function reflectBall(gameState: GameState, normal: [number, number])
{
	const [vx, vy] = gameState.ballVelocity;
	const [nx, ny] = normal;

	const dot = vx * nx + vy * ny;
	gameState.ballVelocity = [
		vx - 2 * dot * nx,
		vy - 2 * dot * ny
	];
}