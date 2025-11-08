import { WebSocket, TemplatedApp } from "uWebSockets.js";
import { RoomInfo, RoomPlayer } from "../models/roomModels.ts";
import {
	createRoom,
	getAllRooms,
	joinRoom,
	leaveRoom,
	getUserCurrentRoom,
	markRoomReady,
	markRoomWaiting,
	getRoomDetails
} from "../services/roomService.ts";

export interface WebSocketUserData
{
	userId: string;
	username: string;
	roomId?: string;
};

export function create(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	userData: WebSocketUserData,
	data: any,
)
{
	const userId = userData?.userId;
	const username = userData?.username;

	if (!userId || !username)
	{
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "User not authenticated or missing username" 
		// }));
		return;
	}

	try
	{
		const result = createRoom(
			data.entryFee,
			userId,
			username,
			data.maxPlayers,
			data.name
		);
		
		if (!result.success)
		{
			// ws.send(JSON.stringify(
			// {
			// 	success: false,
			// 	error: result.message
			// }));

			return;
		}

		const roomId = result.roomId!;

		// Subscribe this WebSocket (which could be lobby or create connection) to the room
		ws.subscribe(`room69:${roomId}`);
		// ws.subscribe(`game69:${roomId}`);

		// unsubscribe from the lobby channel to stop getting other rooms updates
		// ws.unsubscribe("lobby69");

		getRooms(app);
		getRoom(app, userData, { roomId });
		// console.log(`Creator ${userId} subscribed to room ${room.id}`);

		// set currentRoomId in the client
		ws.send(JSON.stringify(
		{
			createRoom:
			{
				success: true,
				roomId: roomId
			}
		}));
		
		console.log(`Room created by ${username} (${userId})`);
	}
	catch (err)
	{
		console.error("Create room error:", err);
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "Failed to create room" 
		// }));
	}
}

export async function join(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	userData: WebSocketUserData,
	data: any
)
{
	const userId = userData?.userId;
	const username = userData?.username;

	if (!userId || !username)
	{
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "User not authenticated or missing username" 
		// }));
		return;
	}

	try
	{
		const result = await joinRoom(data.roomId, userId, username);
		
		if (!result.success)
		{
			// ws.send(JSON.stringify(
			// {
			// 	success: false,
			// 	error: result.message
			// }));
			return;
		}

		// Subscribe to the room
		ws.subscribe(`room69:${data.roomId}`);
		// ws.subscribe(`game69:${data.roomId}`);

		// console.log(`User ${userId} subscribed to room ${data.roomId}`);

		// unsubscribe from the lobby channel to stop getting other rooms updates
		// ws.unsubscribe("lobby69");

		getRooms(app);
		getRoom(app, userData, data);

		ws.send(JSON.stringify(
		{
			joinRoom:
			{
				success: true,
				roomId: data.roomId
			}
		}));
		
		console.log(`${username} (${userId}) joined room: ${data.roomId}`);
	}
	catch (err)
	{
		console.error("Join room error:", err);
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "Failed to join room"
		// }));
	}
}

export function leave(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	userData: WebSocketUserData,
	data: any
)
{
	const userId = userData?.userId;
	const username = userData?.username;

	if (!userId)
	{
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "User not authenticated"
		// }));

		return;
	}

	try
	{
		const result = leaveRoom(data.roomId, userId);

		if (!result.success)
		{
			// ws.send(JSON.stringify(
			// {
			// 	success: false,
			// 	error: result.message
			// }));
			return;
		}

		// Unsubscribe from the room channel
		ws.unsubscribe(`room69:${data.roomId}`);
		// ws.unsubscribe(`game69:${data.roomId}`);

		getRooms(app);
		getRoom(app, userData, data);

		// Notify remaining room members - simple notification
		// const room = getAllRooms().find(r => r.id === data.roomId);
		// if (room)
		// {
			// Simple success response - no hardcoded types
			// ws.send(JSON.stringify(
			// {
			// 	success: true
			// }));
		// }
		ws.send(JSON.stringify(
		{
			leaveRoom:
			{
				success: true
			}
		}));

		console.log(`${username} left room: ${data.roomId}`);
	}
	catch (err)
	{
		console.error("Leave room error:", err);
		ws.send(JSON.stringify(
		{
			success: false,
			error: `Failed to leave room ${data.roomId}`
		}));
	}
}

export function getRoom(
	app: TemplatedApp,
	userData: WebSocketUserData,
	data: any
)
{
	const userId = userData?.userId;

	try
	{
		let roomId : string | undefined = undefined;

		if (data.roomId)
			roomId = data.roomId;
		else
			roomId = getUserCurrentRoom(userId)

		if (roomId)
		{
			const room = getRoomDetails(roomId);
	
			if (room)
			{
				app.publish(`room69:${roomId}`, JSON.stringify(room));
			}
		}
	}
	catch (err)
	{
		console.log(err);
	}
}

export function getRooms(
	app: TemplatedApp
)
{
	try
	{
		app.publish("lobby69", JSON.stringify(
		{
			// currentRoomId: currentRoomId,
			rooms: getAllRooms().map((room: RoomInfo) =>
			{
				return {
					id: room.id,
					name: room.name,
					entryFee: room.entryFee,
					count: room.players.size,
					maxPlayers: room.maxPlayers,
					state: room.state,
				};
			})
		}));
	}
	catch (err)
	{
		console.error("Get rooms error:", err);
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "Failed to get rooms"
		// }));
	}
}

export function getRoomForUser(
	ws: WebSocket<WebSocketUserData>,
	data: any
)
{
	try
	{
		if (data.roomId)
		{
			const room = getRoomDetails(data.roomId);

			if (room)
			{
				ws.send(JSON.stringify(room));
			}
		}
	}
	catch (err)
	{
		console.error("Get room error:", err);
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "Failed to get rooms"
		// }));
	}
}

export function getRoomsForUser(
	ws: WebSocket<WebSocketUserData>
)
{
	try
	{
		ws.send(JSON.stringify(
		{
			// currentRoomId: currentRoomId,
			rooms: getAllRooms().map((room: RoomInfo) =>
			{
				return {
					id: room.id,
					name: room.name,
					entryFee: room.entryFee,
					count: room.players.size,
					maxPlayers: room.maxPlayers,
					state: room.state,
				};
			}),
		}));
	}
	catch (err)
	{
		console.error("Get rooms error:", err);
		// ws.send(JSON.stringify(
		// {
		// 	success: false,
		// 	error: "Failed to get rooms"
		// }));
	}
}

export function markRoomAsReady(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	userData: WebSocketUserData,
	data: any,
)
{
	const userId = userData?.userId;

	if (!userId)
	{
		// ws.send(JSON.stringify({
		// 	success: false,
		// 	error: "User not authenticated"
		// }));
		return;
	}

	try
	{
		const result = markRoomReady(data.roomId, userId);
		
		if (!result.success)
		{
			// ws.send(JSON.stringify({
			// 	success: false,
			// 	error: result.message
			// }));
			return;
		}

		getRoom(app, userData, data);
		// const room = getAllRooms().find(r => r.id === data.roomId);
		// if (room) {
			// Send roomStateChanged directly to this WebSocket
			// ws.send(JSON.stringify({
			// 	roomStateChanged: {
			// 		roomId: data.roomId,
					// newState: "ready",
					// room: {
					// 	// id: room.id,
					// 	name: room.name,
					// 	entryFee: room.entryFee,
					// 	// players: Array.from(room.players).map((player: RoomPlayer) => (
					// 	// {
					// 	// 	id: player.id,
					// 	// 	username: player.username,
					// 	// 	isReady: player.isReady
					// 	// })),
					// 	maxPlayers: room.maxPlayers,
					// 	state: room.state,
					// 	// createdAt: room.createdAt.toISOString()
					// }
			// 	}
			// }));
		// }

		console.log(`Room ${data.roomId} marked as ready by ${userId}`);
	}
	catch (err)
	{
		console.error("Mark room ready error:", err);
		// ws.send(JSON.stringify({
		// 	success: false,
		// 	error: "Failed to mark room as ready"
		// }));
	}
}

export function markRoomAsWaiting(
	app: TemplatedApp,
	ws: WebSocket<WebSocketUserData>,
	userData: WebSocketUserData,
	data: any,
)
{
	const userId = userData?.userId;

	if (!userId)
	{
		// ws.send(JSON.stringify({
		// 	success: false,
		// 	error: "User not authenticated"
		// }));
		return;
	}

	try
	{
		const result = markRoomWaiting(data.roomId, userId);
		
		if (!result.success)
		{
			// ws.send(JSON.stringify({
			// 	success: false,
			// 	error: result.message
			// }));
			return;
		}

		getRoom(app, userData, data);
		// Notify all room members of state change
		// const room = getAllRooms().find(r => r.id === data.roomId);
		// if (room)
		// {
			// ws.send(JSON.stringify({
			// 	roomStateChanged: {
			// 		roomId: data.roomId,
					// newState: "waiting",
					// room: {
					// 	id: room.id,
					// 	name: room.name,
					// 	entryFee: room.entryFee,
					// 	// players: Array.from(room.players).map((player: RoomPlayer) => ({
					// 	// 	id: player.id,
					// 	// 	username: player.username,
					// 	// 	isReady: player.isReady
					// 	// })),
					// 	maxPlayers: room.maxPlayers,
					// 	state: room.state,
					// 	// createdAt: room.createdAt.toISOString()
					// }
			// 	}
			// }));
		// }

		console.log(`Room ${data.roomId} marked as waiting by ${userId}`);
	}
	catch (err)
	{
		console.error("Mark room waiting error:", err);
		// ws.send(JSON.stringify({
		// 	success: false,
		// 	error: "Failed to mark room as waiting"
		// }));
	}
}
