import { workerData } from 'worker_threads';
import game_config from "../game_config.json" with { type: 'json' };

// import { GamePlayer, GameResult, GameState } from '../models/gameModels.ts';


// TODO: for some reason, when ball hits the wall, it can go backwards

interface GameResult
{
	players: Array<{
		id: string;
		username: string;
		place: string;
		playersKicked: number;
		isActive: boolean;
		score: number
	}>;
	state: 'finished' | 'aborted';
	fee: number
}

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
	drag: number;
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

const PADDLE_SIDE_PERCENT = game_config.paddle_half_percent;
const dt = 1 / 60;
const speed = game_config.speed;
// const r = game_config.ball_radius;

function calculateTwoPlayersPositions(players: GamePlayer[])
{
	const leftPlayer = players[0];
	const rightPlayer = players[1];

	const leftPlayerDist = Math.max(-0.4, Math.min(0.4, leftPlayer.position - 0.5));
	const rightPlayerDist = Math.max(-0.4, Math.min(0.4, rightPlayer.position - 0.5));

	// Math.max(-0.5, Math.min(0.3, p.y - paddleHalfHeight))
	// leftmost coordinate of the unit circle
	leftPlayer.y = leftPlayerDist;
	leftPlayer.x = -1;

	// rightmost
	rightPlayer.y = rightPlayerDist;
	rightPlayer.x = 1;
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
			calculateTwoPlayersPositions(activePlayers);
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
		console.log('sending game finished');
		gameState.players.forEach(p => {
			console.log(`username: ${p.username},place:${p.place}, kicked: ${p.playersKicked}`);
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
				state: 'finished',
				fee: workerData.fee
			} as GameResult
		});
	}
}

function getBallNextPosition(gameState: GameState): [number, number]
{
	const ball = gameState.ballPosition;

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

function handlePaddleCollision(gameState: GameState, player: GamePlayer, ix: number, iy: number, playerAcoeff: number, playerBcoeff: number, beta: number)
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

	// const paddleVel: [number, number] = [player.velocityX || 0, player.velocityY || 0];
	const dragX = (player.drag ?? 0) * Math.cos(beta);
	const dragY = (player.drag ?? 0) * Math.sin(beta);
	console.log(`dragX: ${dragX}`);
	console.log(`dragY: ${dragY}`);
	reflectBallWithPaddleVelocity(gameState, normal, [ dragX, dragY ]);

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
		const scorer = gameState.players.find(p => p.id === gameState.whoHitTheBall!.id);
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
		console.log('swithching to countdown');
		gameState.state = 'countdown';
		gameState.countdownSeconds = 5;
		gameState.ballPosition = [0, 0];
		gameState.whoHitTheBall = undefined;

		const activePlayers = gameState.players.filter(p => p.isActive);
		activePlayers.forEach((p, index) =>
		{
			p.position = 0.5;
			if (activePlayers.length === 2)
				p.x = index === 0 ? -1 : 1;
		});
	}
}

function lineSegmentsIntersect(p1: [number, number], p2: [number, number], q1: [number, number], q2: [number, number]): {point: [number, number], t: number} | null
{
	const denom = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);

	if (denom === 0) return null;
	const t = ((q1[0] - p1[0]) * (q2[1] - q1[1]) - (q1[1] - p1[1]) * (q2[0] - q1[0])) / denom;
	const u = ((q1[0] - p1[0]) * (p2[1] - p1[1]) - (q1[1] - p1[1]) * (p2[0] - p1[0])) / denom;

	if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
		const ix = p1[0] + t * (p2[0] - p1[0]);
		const iy = p1[1] + t * (p2[1] - p1[1]);
		return {point: [ix, iy], t};
	}
	return null;
}

function checkTwoPlayerCollisions(gameState: GameState, nextBall: [number, number], parentPort: any): boolean
{
	const ball = gameState.ballPosition as [number, number];
	const players = gameState.players.filter(p => p.isActive);
	const BALL_RADIUS = 0.03;
	const FIELD_HALF_WIDTH = 1.1;
	const FIELD_HALF_HEIGHT = 0.5;

	// Collect potential collisions
	const collisions: {type: 'wall' | 'paddle' | 'goal', normal: [number, number], player?: GamePlayer}[] = [];

	// Top wall
	// let inter = lineSegmentsIntersect(ball, nextBall, [-FIELD_HALF_WIDTH, FIELD_HALF_HEIGHT], [FIELD_HALF_WIDTH, FIELD_HALF_HEIGHT]);
	if ((ball[0] >= -game_config.field_width_2p && ball[0] <= game_config.field_width_2p) && (ball[1] > game_config.field_height_2p))
	{
		console.log("TOP WALL");
		collisions.push({type: 'wall', normal: [0, -1]});
	}

	// Bottom wall
	// inter = lineSegmentsIntersect(ball, nextBall, [-FIELD_HALF_WIDTH, -FIELD_HALF_HEIGHT], [FIELD_HALF_WIDTH, -FIELD_HALF_HEIGHT]);
	if ((ball[0] >= -game_config.field_width_2p && ball[0] <= game_config.field_width_2p) && (ball[1] < -game_config.field_height_2p))
	{
		console.log("BOTTOM WALL");
		collisions.push({type: 'wall', normal: [0, 1]});
	}

	// Paddle collisions
	for (const p of players)
	{
		const paddleHalfHeight = PADDLE_SIDE_PERCENT;
		const side = p.x == -1 ? "left" : "right";
		
		let paddleBottom: [number, number] = [p.x, p.y - paddleHalfHeight];
		let paddleTop: [number, number] = [p.x, p.y + paddleHalfHeight];

		if (side == 'left')
		{
			var tmp = paddleTop[1];
			paddleTop[1] = -paddleBottom[1];
			paddleBottom[1] = -tmp;
		}
		

		// const intersection = getIntersection(ball, nextBall, paddleBottom, paddleTop);
		// if (!intersection) continue;

		// const { ix, iy } = intersection;
		// // Clamp intersection point to actual paddle bounds
		// // const clampedY = Math.max(p.y - PADDLE_SIDE_PERCENT, Math.min(ix, p.y + PADDLE_SIDE_PERCENT));
		// const clampedPoint: [number, number] = [ix, iy];
		// const paddleNormal: [number, number] = p.x < 0 ? [1, 0] : [-1, 0];

		if (side == "left")
		{
			if (ball[0] < -game_config.goal_2p && (ball[1] >= paddleBottom[1] && ball[1] <= paddleTop[1]))
			{
				console.log('WITHIN LEFT PADDLE');
				console.log(`drag: ${p.drag}`);
				console.log(`ball x: ${ball[0]}`);
				console.log(`ball y: ${ball[1]}\n`);

				console.log(`paddle top y: ${paddleTop[1]}`);
				console.log(`paddle bottom y: ${paddleBottom[1]}\n`);

				collisions.push({
					type: 'paddle',
					normal: [1, 0],
					player: p
				});
				break;
			}
			else if (ball[0] < -game_config.goal_2p)
			{
				console.log('GOOOOOAAAAAAAAAAAAL');
				console.log(`ball x: ${ball[0]}`);
				console.log(`ball y: ${ball[1]}\n`);

				console.log(`paddle top y: ${paddleTop[1]}`);
				console.log(`paddle bottom y: ${paddleBottom[1]}\n`);

				collisions.push({
					type: 'goal',
					normal: [1, 0],
					player: p
				});
				break;
			}
		}
		else
		{
			if (ball[0] > game_config.goal_2p && (ball[1] >= paddleBottom[1] && ball[1] <= paddleTop[1]))
			{
				console.log('WITHIN RIGHT PADDLE');
				console.log(`drag: ${p.drag}`);

				console.log(`ball x: ${ball[0]}`);
				console.log(`ball y: ${ball[1]}\n`);

				console.log(`paddle top y: ${paddleTop[1]}`);
				console.log(`paddle bottom y: ${paddleBottom[1]}\n`);

				collisions.push({
					type: 'paddle',
					normal: [-1, 0],
					player: p
				});
				break;
			}
			else if (ball[0] > game_config.goal_2p)
			{
				console.log('GOOOOOAAAAAAAAAAAAL');
				console.log(`ball x: ${ball[0]}`);
				console.log(`ball y: ${ball[1]}\n`);

				console.log(`paddle top y: ${paddleTop[1]}`);
				console.log(`paddle bottom y: ${paddleBottom[1]}\n`);

				collisions.push({
					type: 'goal',
					normal: [-1, 0],
					player: p
				});
				break;
			}
		}
	}

	// Find earliest collision
	if (collisions.length === 0) return false;
	
	// Sort by t value and take the earliest
	// collisions.sort((a, b) => a.t - b.t);
	const earliest = collisions[0];

	//gameState.ballPosition = earliest.point;
	if (earliest.type === 'goal')
	{
		const scoredOn = earliest.player;
		if (scoredOn)
		{
			console.log(`Goal scored on ${scoredOn.username}`);
			handleGoal(gameState, scoredOn, players, parentPort);
		}
	}
	else
	{
		console.log(`${earliest.type === 'wall' ? 'Wall' : 'Paddle'} collision`);

		// Reflect ball velocity
		reflectBallWithPaddleVelocity(gameState, earliest.normal, earliest.type === 'wall' ? [0, 0] : [0, earliest.player?.drag ?? 0]);

		// Larger nudge to prevent re-collision
		const nudge = 0.015;
		gameState.ballPosition[0] += earliest.normal[0] * nudge;
		gameState.ballPosition[1] += earliest.normal[1] * nudge;

		if (earliest.type === 'paddle' && earliest.player)
		{
			// Add spin based on where ball hits paddle
			// const relativeHit = (earliest.point[1] - earliest.player.y) / PADDLE_SIDE_PERCENT;
			// const spinFactor = Math.max(-1, Math.min(1, relativeHit)); // Clamp to [-1, 1]
			// gameState.ballVelocity[1] += spinFactor * 0.015; // Reduced spin for more predictable behavior
			
			gameState.whoHitTheBall = earliest.player;
			console.log(`${earliest.player.username} hit the ball`);
		}
	}

	return true;
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
			handlePaddleCollision(gameState, player, ix, iy, playerAcoeff, playerBcoeff, beta);
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

function reflectBall(gameState: GameState, normal: [number, number], paddleVelocity: [number, number] = [0,0])
{
	let [vx, vy] = gameState.ballPosition;
	const [px, py] = paddleVelocity;
	const [nx, ny] = normal;
	const dot = vx * nx + vy * ny;
	gameState.ballVelocity = [
		vx - 2 * dot * nx,
		vy - 2 * dot * ny
	];
}

export function getPolygonVertices(n: number): [number, number][]
{
	const radius = 0.5 / Math.cos(Math.PI / n);
	const vertices: [number, number][] = [];

	for (let i = 0; i < n; i++) {
		const theta = (2 * Math.PI * i) / n;
		const x = radius * Math.sin(theta);
		const y = radius * Math.cos(theta);
		vertices.push([x, y]);
	}

	return vertices;
}

export function avoidVertexHit(
	pos: [number, number],
	vel: [number, number],
	vertices: [number, number][],
	radius: number = 0.01
): [number, number]
{
	let [vx, vy] = vel;
	let hitVertex = false;

	for (const [xv, yv] of vertices)
	{
		const dx = xv - pos[0];
		const dy = yv - pos[1];
		const t = vx * dx + vy * dy;
		if (t <= 0) continue;
		const d = Math.abs(vx * dy - vy * dx);
		if (d < radius)
		{
			hitVertex = true;
			break;
		}
	}

	if (hitVertex)
	{
		console.log('AVOIDING VERTEX HIT');
		const delta = (Math.random() > 0.5 ? 1 : -1) * 0.02;
		const cos = Math.cos(delta), sin = Math.sin(delta);
		return [vx * cos - vy * sin, vx * sin + vy * cos];
	}

	return [vx, vy];
}


function reflectBallWithPaddleVelocity(
	gameState: GameState,
	normal: [number, number],
	paddleVel: [number, number] = [0,0])
{
	let [vx, vy] = gameState.ballVelocity;

	// Reflect off surface first (for angled paddles)
	if (normal[0] !== 0 || normal[1] !== 0)
	{
		const [nx, ny] = normal;
		const dot = vx * nx + vy * ny;
		vx = vx - 2 * dot * nx;
		vy = vy - 2 * dot * ny;
	}

	// Add paddle velocity
	const [px, py] = paddleVel;
	const nudgedVx = vx + px;
	const nudgedVy = vy + py;

	// console.log(`p velocity y: ${py}`);

	// Normalize (get direction)
	const length = Math.sqrt(nudgedVx * nudgedVx + nudgedVy * nudgedVy);
	let dirVx = 0, dirVy = 0;
	if (length > 0)
	{
		dirVx = nudgedVx / length;
		dirVy = nudgedVy / length;
	}

	// Scale to constant speed
	gameState.ballVelocity = [dirVx * speed, dirVy * speed];


	const n = gameState.players.filter(p => p.isActive).length;
	if (n > 2)
		gameState.ballVelocity = avoidVertexHit(gameState.ballPosition, gameState.ballVelocity, getPolygonVertices(n));
	else
		gameState.ballVelocity = avoidVertexHit(gameState.ballPosition, gameState.ballVelocity, [[-1.1, 0.5], [1.1, 0.5], [-1.1, -0.5], [1.1, -0.5]]);
}