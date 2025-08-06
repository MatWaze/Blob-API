import { FastifyInstance } from "fastify";
import { getUws } from '@geut/fastify-uws';
import { WebSocket, HttpRequest, WebSocketBehavior, HttpResponse, us_socket_context_t, TemplatedApp } from "uWebSockets.js";
import { createRoomAsync, joinRoomAsync, getRoomsAsync, leaveRoomAsync, WebSocketUserData, markRoomReadyAsync, markRoomWaitingAsync } from "../controllers/roomSocketController.ts";
import { StringDecoder } from "string_decoder";
import { getUserCurrentRoom } from "../services/roomService.ts";
import { updatePlayerPositionRelative, isGameActive } from "../services/gameSocketService.ts";
import { handleStartGame } from "../controllers/gameSocketController.ts";

const decoder = new StringDecoder("utf8");

// Common authentication function
async function authenticateWebSocket(res: HttpResponse, req: HttpRequest, context: us_socket_context_t, server: FastifyInstance) {
	console.log("WebSocket upgrade request received");

	res.onAborted(() => {
		console.log("Upgrade request aborted");
	});

	try {
		const cookieHeader = req.getHeader('cookie');
		let token = null;
		
		if (cookieHeader) {
			const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
				const [key, value] = cookie.trim().split('=');
				acc[key] = value;
				return acc;
			}, {} as Record<string, string>);
			
			token = cookies['accessToken'];
		}

		if (!token) {
			console.log("No JWT token found in cookies");
			res.writeStatus('401 Unauthorized');
			res.end('Authentication required');
			return null;
		}

		const decoded: any = await server.jwt.verify(token);
		const userId = decoded.id;
		const username = decoded.username || decoded.name;

		if (!userId || !username) {
			console.log("Invalid JWT token - missing user ID or username");
			res.writeStatus('401 Unauthorized');
			res.end('Invalid token - missing required user data');
			return null;
		}

		console.log("Authenticated user for WebSocket:", username, `(${userId})`);

		return {
			userId: userId.toString(),
			username: username
		};
	} catch (error) {
		console.error("WebSocket authentication error:", error);
		res.writeStatus('401 Unauthorized');
		res.end('Authentication failed');
		return null;
	}
}

// Common WebSocket behavior factory
function createBaseBehavior(server: FastifyInstance): Partial<WebSocketBehavior<WebSocketUserData>> {
	return {
		upgrade: async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
			const userData = await authenticateWebSocket(res, req, context, server);
			if (userData) {
				res.upgrade(
					userData,
					req.getHeader('sec-websocket-key'),
					req.getHeader('sec-websocket-protocol'),
					req.getHeader('sec-websocket-extensions'),
					context
				);
			}
		},
	};
}

export async function gameSocketRoutes(server: FastifyInstance)
{
	const app = getUws(server);
	const baseBehavior = createBaseBehavior(server);

	// Lobby WebSocket - handle room viewing only
	app.ws('/ws/lobby', {
		...baseBehavior,
		open: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				const currentRoomId = getUserCurrentRoom(userData.userId);
				if (currentRoomId) {
					console.log("subscribing to the room");
					ws.subscribe(currentRoomId);         // ← Receives room notifications
					ws.subscribe(`game:${currentRoomId}`); // ← Also receives game state
				}
				console.log("Lobby WebSocket connected for user:", userData.userId);
			}
			getRoomsAsync(ws);
		},
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			// Only allow room list refresh - no state changes
			getRoomsAsync(ws);
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Lobby WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Secure room state management - separate endpoints
	app.ws('/ws/room/markReady', {
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId) {
					// Server determines the room, client can't specify
					markRoomReadyAsync(ws, { roomId }, app);
				} else {
					ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
				}
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Mark ready WebSocket disconnected:", userData.userId);
			}
		}
	});

	app.ws('/ws/room/markWaiting', {
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId) {
					// Server determines the room, client can't specify
					markRoomWaitingAsync(ws, { roomId }, app);
				} else {
					ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
				}
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Mark waiting WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Room creation WebSocket
	app.ws('/ws/room/create', {
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const data = JSON.parse(decoder.write(Buffer.from(message)));
			createRoomAsync(ws, data);
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Create room WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Room joining WebSocket
	app.ws('/ws/room/join', {
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const data = JSON.parse(decoder.write(Buffer.from(message)));
			joinRoomAsync(ws, data, app);
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Join room WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Room leaving WebSocket
	app.ws('/ws/room/leave', {
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const data = JSON.parse(decoder.write(Buffer.from(message)));
			leaveRoomAsync(ws, data, app);
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Leave room WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Game start WebSocket
	app.ws('/ws/game/:roomId/start', {
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId) {
					console.log("starting game");
					handleStartGame(ws, roomId, userData.userId, app);
				} else {
					ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
				}
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Start game WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Game play WebSocket
	app.ws('/ws/game/:roomId', {
		...baseBehavior,
		open: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				const currentRoomId = getUserCurrentRoom(userData.userId);
				if (currentRoomId) {
					ws.subscribe(`game:${currentRoomId}`);  // Only receives game state updates
					console.log(`Game player ${userData.userId} subscribed to game:${currentRoomId}`);
				} else {
					console.log("Player not in any room - closing game connection");
					ws.close();
				}
			}
		},
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId) {
					// Only accept input if game is active and in playing state
					if (!isGameActive(roomId)) {
						console.log(`Player ${userData.userId} tried to send input but no active game in room ${roomId}`);
						return;
					}

					const deltaString = decoder.write(Buffer.from(message));
					const delta = parseFloat(deltaString);
					if (!isNaN(delta)) {
						console.log(`Player ${userData.userId} sent delta: ${delta}`);
						updatePlayerPositionRelative(roomId, userData.userId, delta);
					}
				}
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) => {
			const userData = ws.getUserData();
			if (userData?.userId) {
				console.log("Game player WebSocket disconnected:", userData.userId);
			}
		}
	});

	// Add this to handle messages from game worker
	process.on('message', (message: any) =>
	{
		if (message.type === 'playerEliminated')
		{
			// Broadcast player elimination to all clients in the room
			app.publish(message.roomId, JSON.stringify(
			{
				type: 'playerEliminated',
				playerId: message.playerId,
				playerName: message.playerName
			}));
		}
	});
}