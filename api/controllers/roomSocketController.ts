import { WebSocket, TemplatedApp } from "uWebSockets.js";
import { RoomInfo, RoomPlayer } from "../models/roomModels.ts";
import {
	createRoom,
	getAllRooms,
	joinRoom,
	leaveRoom,
	getUserCurrentRoom,
	isUserRoomCreator,
	getRoomCreator,
	markRoomReady,
	markRoomWaiting
} from "../services/roomService.ts";

interface WebSocketUserData
{
	userId: string;
	username: string;
	roomId?: string;
};

export function create(
	ws: WebSocket<WebSocketUserData>,
	data: any,
)
{
	const userData = ws.getUserData();
	const userId = userData?.userId;
	const username = userData?.username;

	if (!userId || !username)
	{
		ws.send(JSON.stringify(
		{
			success: false,
			error: "User not authenticated or missing username" 
		}));
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
			ws.send(JSON.stringify(
			{
				success: false,
				error: result.message
			}));

			return;
		}

		const room = result.room!;
		
		// Subscribe this WebSocket (which could be lobby or create connection) to the room
		ws.subscribe(room.id);
		ws.subscribe(`game:${room.id}`);
		console.log(`Creator ${userId} subscribed to room ${room.id}`);

		// Simple success response - no hardcoded types
		ws.send(JSON.stringify(
		{
			success: true,
			roomId: room.id,
			isCreator: true,
			room: {
				id: room.id,
				name: room.name,
				entryFee: room.entryFee,
				players: Array.from(room.players).map((player: RoomPlayer) => ({
					id: player.id,
					username: player.username
				})),
				maxPlayers: room.maxPlayers,
				state: room.state,
				createdAt: room.createdAt.toISOString()
			}
		}));
		
		console.log(`Room created by ${username} (${userId}): ${room.id}`);
	}
	catch (err)
	{
		console.error("Create room error:", err);
		ws.send(JSON.stringify(
		{
			success: false,
			error: "Failed to create room" 
		}));
	}
}

export function join(
	ws: WebSocket<WebSocketUserData>,
	data: any
)
{
	const userData = ws.getUserData();
	const userId = userData?.userId;
	const username = userData?.username;

	if (!userId || !username)
	{
		ws.send(JSON.stringify(
		{
			success: false,
			error: "User not authenticated or missing username" 
		}));
		return;
	}

	try
	{
		console.log(data.roomId);
		const result = joinRoom(data.roomId, userId, username);
		
		if (!result.success)
		{
			ws.send(JSON.stringify(
			{
				success: false,
				error: result.message
			}));
			return;
		}
		
		// Subscribe to the room
		ws.subscribe(data.roomId);
		ws.subscribe(`game:${data.roomId}`);
		console.log(`User ${userId} subscribed to room ${data.roomId}`);

		const room = getAllRooms().find(r => r.id === data.roomId);
		
		// Simple success response - no hardcoded types
		ws.send(JSON.stringify(
		{
			success: true,
			isCreator: isUserRoomCreator(userId, data.roomId),
			room: room ? {
				id: room.id,
				name: room.id,
				entryFee: room.entryFee,
				players: Array.from(room.players).map((player: RoomPlayer) => ({
					id: player.id,
					username: player.username
				})),
				maxPlayers: room.maxPlayers,
				state: room.state,
				createdAt: room.createdAt.toISOString()
			} : null
		}));
		
		// Notify other room members - simple notification with updated room state
		// app.publish(data.roomId, JSON.stringify(
		// {
		// 	userJoined: {
		// 		userId: userId,
		// 		username: username,
		// 		room: room ? {
		// 			id: room.id,
		// 			name: room.name,
		// 			entryFee: room.entryFee,
		// 			players: Array.from(room.players).map((player: RoomPlayer) => ({
		// 				id: player.id,
		// 				username: player.username
		// 			})),
		// 			maxPlayers: room.maxPlayers,
		// 			state: room.state,
		// 			createdAt: room.createdAt.toISOString()
		// 		} : null
		// 	}
		// }));
		
		console.log(`${username} (${userId}) joined room: ${data.roomId}`);
	}
	catch (err)
	{
		console.error("Join room error:", err);
		ws.send(JSON.stringify(
		{
			success: false,
			error: "Failed to join room"
		}));
	}
}

export function leave(
	ws: WebSocket<WebSocketUserData>,
	data: any,
	app: TemplatedApp
)
{
	console.log(data);
	const userData = ws.getUserData();
	const userId = userData?.userId;
	const username = userData?.username;

	if (!userId)
	{
		ws.send(JSON.stringify(
		{
			success: false,
			error: "User not authenticated"
		}));

		return;
	}

	try
	{
		console.log(data.roomId);
		const result = leaveRoom(data.roomId, userId);

		if (!result.success)
		{
			ws.send(JSON.stringify(
			{
				success: false,
				error: result.message
			}));
			return;
		}

		// Unsubscribe from the room channel
		ws.unsubscribe(data.roomId);
		
		// Notify remaining room members - simple notification
		const room = getAllRooms().find(r => r.id === data.roomId);
		if (room)
		{
			// app.publish(data.roomId, JSON.stringify(
			// {
			// 	userLeft: {
			// 		userId: userId,
			// 		username: username,
			// 		room: {
			// 			id: room.id,
			// 			name: room.name,
			// 			entryFee: room.entryFee,
			// 			players: Array.from(room.players).map((player: RoomPlayer) =>
			// 			({
			// 				id: player.id,
			// 				username: player.username
			// 			})),
			// 			maxPlayers: room.maxPlayers,
			// 			state: room.state,
			// 			createdAt: room.createdAt.toISOString()
			// 		}
			// 	}
			// }));
		// Simple success response - no hardcoded types
			ws.send(JSON.stringify(
			{
				success: true,
				room: room
			}));
		}
		
		console.log(`${username || userId} left room: ${data.roomId}`);
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

export function getRooms(ws: WebSocket<WebSocketUserData>)
{
	const userData = ws.getUserData();
	const userId = userData?.userId;

	try
	{
		const currentRoomId = userId ? getUserCurrentRoom(userId) : undefined;
		
		// Direct rooms array - no hardcoded message types
		ws.send(JSON.stringify(
		{
			rooms: getAllRooms().map((room: RoomInfo) =>
			{
				const creator = getRoomCreator(room.id);
				return {
					id: room.id,
					name: room.name,
					entryFee: room.entryFee,
					players: Array.from(room.players).map((player: RoomPlayer) =>
					({
						id: player.id,
						username: player.username
					})),
					maxPlayers: room.maxPlayers,
					state: room.state,
					createdAt: room.createdAt.toISOString(),
					createdBy: creator?.id,
					creatorUsername: creator?.username,
					isCurrentRoom: currentRoomId === room.id,
					isCreator: userId ? isUserRoomCreator(userId, room.id) : false
				};
			}),
			currentRoomId: currentRoomId
		}));
	}
	catch (err)
	{
		console.error("Get rooms error:", err);
		ws.send(JSON.stringify(
		{
			success: false,
			error: "Failed to get rooms"
		}));
	}
}

export function markRoomAsReady(
	ws: WebSocket<WebSocketUserData>,
	data: any,
	app: TemplatedApp
)
{
	const userData = ws.getUserData();
	const userId = userData?.userId;

	if (!userId)
	{
		ws.send(JSON.stringify({
			success: false,
			error: "User not authenticated"
		}));
		return;
	}

	try
	{
		const result = markRoomReady(data.roomId, userId);
		
		if (!result.success)
		{
			ws.send(JSON.stringify({
				success: false,
				error: result.message
			}));
			return;
		}

		// ws.send(JSON.stringify({
		// 	success: true,
		// 	message: "Room marked as ready"
		// }));

		// Get updated room and send direct update to the requesting client
		const room = getAllRooms().find(r => r.id === data.roomId);
		if (room) {
			// Send roomStateChanged directly to this WebSocket
			ws.send(JSON.stringify({
				roomStateChanged: {
					roomId: data.roomId,
					newState: "ready",
					room: {
						id: room.id,
						name: room.name,
						entryFee: room.entryFee,
						players: Array.from(room.players).map((player: RoomPlayer) => ({
							id: player.id,
							username: player.username
						})),
						maxPlayers: room.maxPlayers,
						state: room.state,
						createdAt: room.createdAt.toISOString()
					}
				}
			}));

			// Also publish to room subscribers
			// app.publish(data.roomId, JSON.stringify({
			// 	roomStateChanged: {
			// 		roomId: data.roomId,
			// 		newState: "ready",
			// 		room: {
			// 			id: room.id,
			// 			entryFee: room.entryFee,
			// 			players: Array.from(room.players).map((player: RoomPlayer) => ({
			// 				id: player.id,
			// 				username: player.username
			// 			})),
			// 			maxPlayers: room.maxPlayers,
			// 			state: room.state,
			// 			createdAt: room.createdAt.toISOString()
			// 		}
			// 	}
			// }));
		}

		console.log(`Room ${data.roomId} marked as ready by ${userId}`);
	}
	catch (err)
	{
		console.error("Mark room ready error:", err);
		ws.send(JSON.stringify({
			success: false,
			error: "Failed to mark room as ready"
		}));
	}
}

export function markRoomAsWaiting(
	ws: WebSocket<WebSocketUserData>,
	data: any,
	app: TemplatedApp
)
{
	const userData = ws.getUserData();
	const userId = userData?.userId;

	if (!userId)
	{
		ws.send(JSON.stringify({
			success: false,
			error: "User not authenticated"
		}));
		return;
	}

	try
	{
		const result = markRoomWaiting(data.roomId, userId);
		
		if (!result.success)
		{
			ws.send(JSON.stringify({
				success: false,
				error: result.message
			}));
			return;
		}

		// ws.send(JSON.stringify({
		// 	success: true,
		// 	message: "Room marked as waiting"
		// }));

		// Notify all room members of state change
		const room = getAllRooms().find(r => r.id === data.roomId);
		if (room)
		{
			app.publish(data.roomId, JSON.stringify({
				roomStateChanged: {
					roomId: data.roomId,
					newState: "waiting",
					room: {
						id: room.id,
						name: room.name,
						entryFee: room.entryFee,
						players: Array.from(room.players).map((player: RoomPlayer) => ({
							id: player.id,
							username: player.username
						})),
						maxPlayers: room.maxPlayers,
						state: room.state,
						createdAt: room.createdAt.toISOString()
					}
				}
			}));
		}

		console.log(`Room ${data.roomId} marked as waiting by ${userId}`);
	}
	catch (err)
	{
		console.error("Mark room waiting error:", err);
		ws.send(JSON.stringify({
			success: false,
			error: "Failed to mark room as waiting"
		}));
	}
}
export { WebSocketUserData };

