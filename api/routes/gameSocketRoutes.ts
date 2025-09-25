import { FastifyInstance } from "fastify";
import { getUws } from '@geut/fastify-uws';
import { WebSocket } from "uWebSockets.js";
import { create, join, getRooms, leave, markRoomAsReady, markRoomAsWaiting } from "../controllers/roomSocketController.ts";
import { StringDecoder } from "string_decoder";
import { getUserCurrentRoom } from "../services/roomService.ts";
import { updatePlayerPositionRelative, isGameActive } from "../services/gameSocketService.ts";
import { createBaseBehavior, handleStartGame } from "../controllers/gameSocketController.ts";
import { WebSocketUserData } from "../controllers/roomSocketController.ts";

const decoder = new StringDecoder("utf8");

export async function gameSocketRoutes(server: FastifyInstance)
{
	const app = getUws(server);
	const baseBehavior = await createBaseBehavior(server);

	// Lobby WebSocket - handle room viewing only
	app.ws('/ws/lobby',
	{
		...baseBehavior,
		open: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
			{
				const currentRoomId = getUserCurrentRoom(userData.userId);
				if (currentRoomId)
				{
					// subscrive to both room and game channels
					ws.subscribe(currentRoomId);
					ws.subscribe(`game:${currentRoomId}`);
				}
				console.log("Lobby WebSocket connected for user:", userData.userId);
			}
			getRooms(ws);
		},
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			getRooms(ws);
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();

			if (userData?.userId)
				console.log("Lobby WebSocket disconnected:", userData.userId);
		}
	});

	// Secure room state management - separate endpoints
	app.ws('/ws/room/markReady',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
			{
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId)
					markRoomAsReady(ws, { roomId }, app);
				else
					ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Mark ready WebSocket disconnected:", userData.userId);
		}
	});

	app.ws('/ws/room/markWaiting',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
			{
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId)
					markRoomAsWaiting(ws, { roomId }, app);
				else
					ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Mark waiting WebSocket disconnected:", userData.userId);
		}
	});

	// Room creation WebSocket
	app.ws('/ws/room/create',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const data = JSON.parse(decoder.write(Buffer.from(message)));
			create(ws, data);
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Create room WebSocket disconnected:", userData.userId);
		}
	});

	// Room joining WebSocket
	app.ws('/ws/room/join',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const data = JSON.parse(decoder.write(Buffer.from(message)));
			join(ws, data);
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Join room WebSocket disconnected:", userData.userId);
		}
	});

	// Room leaving WebSocket
	app.ws('/ws/room/leave',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const data = JSON.parse(decoder.write(Buffer.from(message)));
			leave(ws, data, app);
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Leave room WebSocket disconnected:", userData.userId);
		}
	});

	// Game start WebSocket
	app.ws('/ws/game/:roomId/start',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
			{
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId)
					handleStartGame(ws, roomId, userData.userId, app);
				else
					ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Start game WebSocket disconnected:", userData.userId);
		}
	});

	// Play Game WebSocket
	app.ws('/ws/game/:roomId',
	{
		...baseBehavior,
		open: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
			{
				const currentRoomId = getUserCurrentRoom(userData.userId);
				if (currentRoomId)
				{
					ws.subscribe(`game:${currentRoomId}`);
					console.log(`Game player ${userData.userId} subscribed to game:${currentRoomId}`);
				}
				else
					ws.close();
			}
		},
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
			{
				const roomId = getUserCurrentRoom(userData.userId);
				if (roomId)
				{
					// Server does this check just in case
					if (!isGameActive(roomId))
					{
						console.log(`Player ${userData.userId} tried to send input but no active game in room ${roomId}`);
						return;
					}

					const dragString = decoder.write(Buffer.from(message));
					const drag = parseFloat(dragString);

					if (!isNaN(drag))
						updatePlayerPositionRelative(roomId, userData.userId, drag);
				}
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Game player WebSocket disconnected:", userData.userId);
		}
	});
}