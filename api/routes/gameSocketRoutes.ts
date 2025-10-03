import { FastifyInstance } from "fastify";
import { getUws } from '@geut/fastify-uws';
import { WebSocket } from "uWebSockets.js";
import { create, join, getRooms, leave, markRoomAsReady, markRoomAsWaiting, getRoom, getRoomsForUser } from "../controllers/roomSocketController.ts";
import { StringDecoder } from "string_decoder";
import { getRoomDetails, getUserCurrentRoom } from "../services/roomService.ts";
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
			console.log(`User ${ws.getUserData().userId} connected to Lobby WebSocket.`);
		},
		message: (ws: WebSocket<WebSocketUserData>, message: ArrayBuffer) =>
		{
			const userData = ws.getUserData();
			const data = JSON.parse(decoder.write(Buffer.from(message)));

			switch (data.type)
			{
				case "CREATE_ROOM":
					create(app, ws, userData, data);
					break;
				case "JOIN_ROOM":
					join(app, ws, userData, data);
					break;
				case "LEAVE_ROOM":
					leave(app, ws, userData, data);
					break;
				case "GET_ROOM":
					getRoom(app, userData, data);
					break;
				case "READY":
					markRoomAsReady(app, ws, userData, data);
					break;
				case "WAITING":
					markRoomAsWaiting(app, ws, userData, data);
					break;
				case "START_GAME":
					handleStartGame(app, ws, data.roomId);
					break;
				case "GAME_DATA":
					updatePlayerPositionRelative(userData.userId, data);
					break;
				case "UNSUBSCRIBE_ROOM":
					var roomId : string | undefined;

					if (data.roomId)
						roomId = data.roomId;
					else
						roomId = getUserCurrentRoom(userData.userId);

					if (roomId)
						ws.unsubscribe(`room69:${data.roomId}`);

					break;
				case "UNSUBSCRIBE_GAME":
					var roomId : string | undefined;

					if (data.roomId)
						roomId = data.roomId;
					else
						roomId = getUserCurrentRoom(userData.userId);

					if (roomId) ws.unsubscribe(`game69:${data.roomId}`);

					break;
				case "SUBSCRIBE_ROOM":
					var roomId : string | undefined;

					if (data.roomId)
						roomId = data.roomId;
					else
						roomId = getUserCurrentRoom(userData.userId);

					if (roomId) ws.subscribe(`room69:${data.roomId}`);

					break;
				case "SUBSCRIBE_GAME":
					var roomId : string | undefined;

					if (data.roomId)
						roomId = data.roomId;
					else
						roomId = getUserCurrentRoom(userData.userId);

					if (roomId) ws.subscribe(`game69:${data.roomId}`);

					break;
				case "SUBSCRIBE_LOBBY":
					ws.subscribe("lobby69");
					getRoomsForUser(ws);
					break;
				case "UNSUBSCRIBE_LOBBY":
					ws.unsubscribe("lobby69");
				case "SUBSCRIBE_PRIVATE":
					ws.subscribe(`user:${ws.getUserData().userId}`);
				case "UNSUBSCRIBE_PRIVATE":
					ws.unsubscribe(`user:${ws.getUserData().userId}`);
				default:
					break;
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();

			if (userData?.userId)
				console.log("Lobby WebSocket disconnected:", userData.userId);
		}
	});

	/*
	// Get room details
	app.ws('/ws/room/:roomId/details',
	{
		...baseBehavior,
		message: (ws: WebSocket<WebSocketUserData>) =>
		{
			const roomIdFromUrl = ws.getParameter(0);

			if (roomIdFromUrl)
			{
				const room = getRoomDetails(roomIdFromUrl);

				if (room)
					ws.send(JSON.stringify(room));
			}
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Room Details WebSocket disconnected");
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
			leave(ws, data);
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
			const roomId = ws.getParameter(0);

			if (userData.userId && roomId)
				handleStartGame(ws, roomId, userData.userId, app);
			else
				ws.send(JSON.stringify({ success: false, error: "Not in any room" }));
		},
		close: (ws: WebSocket<WebSocketUserData>) =>
		{
			const userData = ws.getUserData();
			if (userData?.userId)
				console.log("Start game WebSocket disconnected:", userData.userId);
		}
	});

	// Play Game WebSocket
	app.ws('/ws/game',
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
	*/
}