import { WebSocket, TemplatedApp, HttpResponse, HttpRequest, WebSocketBehavior, us_socket_context_t } from "uWebSockets.js";
import { WebSocketUserData } from "./roomSocketController.ts";
import { FastifyInstance } from "fastify";
import { getRoomDetails, isUserRoomCreator, rooms } from "../services/roomService.ts";
import { createGame, getGameWorker, stopGame } from "../services/gameSocketService.ts";
import { FastifyJWT } from "@fastify/jwt";
import { GameResult } from "../models/gameModels.ts";
import { getSession, updateSessionAccessToken } from "../services/sessionService.ts";

// async function authenticateWebSocket(res: HttpResponse, req: HttpRequest, server: FastifyInstance)
// : Promise<{userId: string, username: string, email: string } | null>
// {
// 	console.log("WebSocket upgrade request received");
// 	console.log("All headers:", Object.fromEntries(
// 		Object.entries(req).filter(([key]) => key.startsWith('get')).map(([key, fn]) => [
// 			key.replace('get', '').toLowerCase(), 
// 			typeof fn === 'function' ? fn.call(req) : fn
// 		])
// 	));

// 	const cookieHeader = req.getHeader('cookie');
// 	console.log("Raw cookie header:", cookieHeader);
	
// 	res.onAborted(() =>
// 	{
// 		console.log("Upgrade request aborted");
// 	});

// 	try
// 	{
// 		let accessToken = null;

// 		if (cookieHeader)
// 		{
// 			const cookies = cookieHeader.split(';').reduce((acc, cookie) =>
// 			{
// 				const [key, value] = cookie.trim().split('=');
// 				acc[key] = value;
// 				return acc;
// 			},
// 			{} as Record<string, string>);
			
// 			accessToken = cookies['accessToken'];
// 		}

// 		if (accessToken)
// 		{
// 			try
// 			{
// 				const decoded = server.jwt.verify(accessToken) as FastifyJWT;

// 				const userId = decoded.id;
// 				const email = decoded.email;
// 				const username = decoded.username;

// 				if (userId && username && email)
// 				{
// 					console.log("Authenticated user for WebSocket with access token:", username, `(${userId})`);
// 					return {
// 						userId: userId.toString(),
// 						username: username,
// 						email: email
// 					};
// 				}
// 			}
// 			catch (accessTokenError)
// 			{
// 				console.log("Access token invalid/expired, trying refresh token");
// 			}
// 		}

// 		console.log("No valid tokens found");
// 		res.writeStatus('401 Unauthorized');
// 		res.end('Authentication required - please refresh your tokens');
// 		return null;
// 	}
// 	catch (error)
// 	{
// 		console.error("WebSocket authentication error:", error);
// 		res.writeStatus('401 Unauthorized');
// 		res.end('Authentication failed');
// 		return null;
// 	}
// }

function getSessionCookie(req: HttpRequest, cookie: string)
{
	const value = `; ${cookie}`;
	const parts = value.split(`sessionId=`);

	if (parts.length === 2)
		return parts.pop()!.split(';').shift();

	return null;
}

async function authenticateWebSocket(
	res: HttpResponse,
	req: HttpRequest,
	server: FastifyInstance
) : Promise<{userId: string, username: string, email: string } | null>
{
	console.log("WebSocket upgrade request received");
	
	res.onAborted(() =>
	{
		console.log("Upgrade request aborted");
		return null;
	});

	try
	{
		// console.log(req.getHeader('cookie'));
		var sessionId = getSessionCookie(req, req.getHeader('cookie'));
		// console.log(`sessionId: ${sessionId}`);
		if (!sessionId)
		{
			const query = req.getQuery();
			sessionId = new URLSearchParams(query).get('sId');
		}

		if (!sessionId)
		{
			console.log("No session ID found in query");

			return null;
		}

		const sessionData = await getSession(sessionId);
		if (!sessionData)
		{
			console.log("No active session for user:", sessionId);
			return null;
		}

		let accessToken = sessionData.accessToken
		// Verify/refresh tokens...
		if (accessToken)
		{
			try
			{
				server.jwt.verify(accessToken) as FastifyJWT;
				console.log("Authenticated via stored token:", sessionData.username, `(${sessionData.userId})`);
				return {
					userId: sessionData.userId,
					username: sessionData.username,
					email: sessionData.email
				};
			}
			catch (error)
			{
				if (sessionData.refreshToken)
				{
					try
					{
						const decoded = server.jwt.verify(sessionData.refreshToken) as FastifyJWT;
						
						accessToken = server.jwt.sign(
						{
							id: decoded.id,
							username: decoded.username,
							email: decoded.email
						}, { expiresIn: '15m' });

						await updateSessionAccessToken(sessionId, { accessToken });
						return {
							userId: sessionData.userId,
							username: sessionData.username,
							email: sessionData.email
						};
					}
					catch (error)
					{
						// sessionStore.destroySession(sessionId);
						console.log("No valid tokens found");
						return null;
					}
				}
			}
		}
		return null;
	}
	catch (error)
	{
		console.error("WebSocket authentication error:", error);

		res.cork(() =>
		{
			res.writeStatus('401 Unauthorized');
			res.end('Authentication required');
		});
		return null;
	}
}

export async function createBaseBehavior(server: FastifyInstance): Promise<Partial<WebSocketBehavior<WebSocketUserData>>>
{
	return {
		upgrade: async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) =>
		{
			const secWebSocketKey = req.getHeader('sec-websocket-key');
			const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
			const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

			const userData = await authenticateWebSocket(res, req, server);
			if (userData)
			{
				res.cork(() =>
				{
					res.upgrade(
						userData,
						secWebSocketKey,
						secWebSocketProtocol,
						secWebSocketExtensions,
						context
					);
				})
			}
			else if (userData === null)
			{
				console.log("No valid tokens found");
				// res.cork(() =>
				// {
				// 	res.writeStatus('401 Unauthorized');
				// 	res.end('LOGIN_AGAIN');
				// });
			}
		},
	};
}

export function handleStartGame(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	userData: WebSocketUserData,
	roomId: string,
)
{
	if (!isUserRoomCreator(userData.userId, roomId))
	{
		ws.send(JSON.stringify(
		{
			success: false,
			message: "Only room creator can start game" 
		}));

		return;
	}

	const room = rooms.get(roomId);

	if (!room)
	{
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	message: "Room not found"
		// }));
		return;
	}

	room.players.forEach(p =>
	{
		if (!p.isReady)
		{
			// ws.send(JSON.stringify(
			// {
			// 	success: false,
			// 	message: `Player ${p.username} is not ready yet.`
			// }))
			return;
		}
	});
	// check if there are enough players in the game
	// if (players.length < room.maxPlayers / 2)
	// {
	// 	ws.send(JSON.stringify(
	// 	{
	// 		success: false,
	// 		message: "Not enough players to start the game. Must be at least half of the maximum player count."
	// 	}))
	// }

	const success = createGame(roomId, Array.from(room.players));

	if (success)
	{
		// ws.send(JSON.stringify(
		// {
		// 	success: true,
		// 	message: "Game started"
		// }));
		setupGameBroadcaster(app, ws, roomId);
		// console.log(`Game started in room ${roomId} by ${userId}`);
	}
	else
	{
		ws.send(JSON.stringify(
		{
			success: false,
			message: "Failed to start game"
		}));
	}
}

function setupGameBroadcaster(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	roomId: string
)
{
	const worker = getGameWorker(roomId);
	if (!worker)
	{
		console.error(`No worker found for room ${roomId}`);
		return;
	}

	// let gameStartNotificationSent = false;

	worker.on('message', async (message) =>
	{
		try
		{
			if (message.type === 'gameState')
			{
				// if (!gameStartNotificationSent)
				// {
				// 	console.log(`Sending game start notification to room ${roomId}`);
				// 	app.publish(roomId, JSON.stringify(
				// 	{
				// 		type: 'started',
				// 		roomId: roomId
				// 	}));
				// 	gameStartNotificationSent = true;
				// }

				const gameStateMessage = JSON.stringify(
				{
					state: message.state.state,
					ballPosition: message.state.ballPosition,
					players: message.state.players
						.filter((p: any) => p.isActive)
						.map((p: any) =>
						({
							id: p.id,
							username: p.username,
							position: p.position,
							isActive: p.isActive
						})),
					countdownSeconds: message.state.state === 'countdown' ?
						Math.ceil(message.state.countdownSeconds) : undefined
				});

				app.publish(`game69:${roomId}`, gameStateMessage);
			}
			else if (message.type === 'gameFinished')
			{
				await stopGame(roomId, message.gameResult);

				app.publish(`room69:${roomId}`, JSON.stringify({
					gameResult: message.gameResult as GameResult
				}));

				ws.subscribe("lobby69");
				return;
			}
		}
		catch (error)
		{
			console.error(`Error in game broadcaster for room ${roomId}:`, error);
		}
	});

	worker.on('error', (error) =>
	{
		console.error(`Game worker error for room ${roomId}:`, error);
	});

	worker.on('exit', (code) =>
	{
		console.log(`Game worker exited for room ${roomId} with code ${code}`);
		if (code !== 0)
			console.error(`Game worker crashed for room ${roomId}`);
	});
}