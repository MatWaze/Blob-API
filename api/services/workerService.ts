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
	leftPlayer.x = -1;
	leftPlayer.y += leftPlayerDist; 
	
	// rightmost
	rightPlayer.x = 1;
	rightPlayer.y += rightPlayerDist; 
}

export 	function calculatePlayerPositions(gameState: GameState)
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

		if (activePlayers.length == 2)
			calculateTwoPlayersPositions(activePlayers);
		else
		{
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
	console.log(`Player ${player.username} was scored on! Players left: ${players.length}`);
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

function checkTwoPlayerCollisions(gameState: GameState, parentPort: any): boolean {
	const ball = gameState.ballPosition as [number, number];
	const nextBall = getBallNextPosition(gameState);
	const players = gameState.players.filter(p => p.isActive);
	
	if (players.length !== 2) return false;

	// Check boundary collisions first (top and bottom walls)
	if (nextBall[1] <= -0.5 || nextBall[1] >= 0.5) {
		console.log(`Ball hit ${nextBall[1] <= -0.5 ? 'top' : 'bottom'} boundary`);
		// Reflect ball vertically off top/bottom walls
		gameState.ballVelocity[1] = -gameState.ballVelocity[1];
		
		// Clamp ball position to boundary with small offset
		if (nextBall[1] <= -0.5) {
			gameState.ballPosition[1] = -0.5 + 0.005;
		} else {
			gameState.ballPosition[1] = 0.5 - 0.005;
		}
		
		return true;
	}

	// Check if ball goes past left or right boundaries (goals)
	if (nextBall[0] <= -1.1 || nextBall[0] >= 1.1) {
		const scoredOnPlayer = nextBall[0] <= -1.1 ? players.find(p => p.x < 0) : players.find(p => p.x > 0);
		if (scoredOnPlayer) {
			console.log(`Ball went past ${nextBall[0] <= -1.1 ? 'left' : 'right'} boundary - goal!`);
			handleGoal(gameState, scoredOnPlayer, players, parentPort);
			return true;
		}
	}

	// Check paddle collisions - use actual paddle X positions
	for (const player of players) {
		// Determine if this is left or right player and use actual X position
		const isLeftPlayer = player.x < 0;
		const paddleX = player.x; // Use actual calculated X position (-1 or +1)
		
		// Calculate paddle vertical extent based on player position
		const paddleTop = player.y - PADDLE_SIDE_PERCENT;
		const paddleBottom = player.y + PADDLE_SIDE_PERCENT;
		
		// Check if ball trajectory crosses this paddle's X level
		if ((isLeftPlayer && ball[0] >= paddleX && nextBall[0] <= paddleX) || 
			(!isLeftPlayer && ball[0] <= paddleX && nextBall[0] >= paddleX)) {
			
			// Calculate Y position where ball crosses paddle X level
			const dx = nextBall[0] - ball[0];
			if (Math.abs(dx) < 1e-6) continue; // Avoid division by zero
			
			const t = (paddleX - ball[0]) / dx;
			const crossY = ball[1] + t * (nextBall[1] - ball[1]);
			
			// Check if intersection is within ball's path (t between 0 and 1)
			if (t >= 0 && t <= 1) {
				// Check if crossY is within paddle bounds
				if (crossY >= paddleTop && crossY <= paddleBottom) {
					// Ball hits paddle - reflect horizontally
					console.log(`Ball hit ${isLeftPlayer ? 'left' : 'right'} player's paddle`);
					
					// Reflect ball horizontally
					gameState.ballVelocity[0] = -gameState.ballVelocity[0];
					
					// Move ball to collision point with slight offset
					gameState.ballPosition[0] = paddleX + (isLeftPlayer ? 0.005 : -0.005);
					gameState.ballPosition[1] = crossY;
					gameState.whoHitTheBall = player;
					
					return true;
				}
			}
		}
	}
	
	return false;
}

export function checkCollisions(gameState: GameState, parentPort: any)
{
	// Only check collisions during playing state
	if (gameState.state !== 'playing') return false;
	
	const players = gameState.players.filter(p => p.isActive);
	if (players.length < 2) return false;

	// Use specialized 2-player collision detection for pong-style gameplay
	if (players.length === 2) {
		return checkTwoPlayerCollisions(gameState, parentPort);
	}

	// Original multi-player collision detection
	const ball = gameState.ballPosition as [number, number];
	const nextBall = getBallNextPosition(gameState);

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