import { randomBytes } from "crypto";
import { RoomDetails, RoomInfo, RoomPlayer } from "../models/roomModels";
import { gameWorkers, stopGame } from "./gameSocketService";
import { getUserById } from "./userService.ts";
import { payFee } from "./transactionService";

export const rooms = new Map<string, RoomInfo>();
export const userRoomMapping = new Map<string, string>(); // userId -> roomId

export function createRoom(
	entryFee: number,
	creatorUserId: string,
	creatorUsername: string,
	maxPlayers: number,
	name: string
): { success: boolean; message?: string; roomId?: string; }
{
	if (userRoomMapping.has(creatorUserId))
	{
		const existingRoomId = userRoomMapping.get(creatorUserId);
		return {
			success: false,
			message: `You are already in room ${existingRoomId}. Leave it first to create a new room.` 
		};
	}

	const id = randomBytes(12).toString("hex");
	const room: RoomInfo = {
		id,
		name,
		entryFee,
		players: new Set<RoomPlayer>(),
		maxPlayers,
		createdAt: new Date(),
		state: "waiting",
	};

	// Always auto-join creator
	const creatorPlayer: RoomPlayer = {
		id: creatorUserId,
		username: creatorUsername,
		isReady: false,
		alias: undefined
	};
	room.players.add(creatorPlayer);
	rooms.set(id, room);

	userRoomMapping.set(creatorUserId, id);

	console.log(`Room ${id} created by ${creatorUsername} (${creatorUserId})`);
	return { success: true, roomId: id };
}

export async function joinRoom(
	roomId: string,
	userId: string,
	username: string
): Promise<{ success: boolean; message?: string }>
{
	if (userRoomMapping.has(userId)) {
		const existingRoomId = userRoomMapping.get(userId);
		if (existingRoomId && existingRoomId === roomId) {
			return { success: false, message: "You are already in this room" };
		}
		// else {
		// 	return {
		// 		success: false,
		// 		message: `You are already in room ${existingRoomId}. Leave it first to join another room.` 
		// 	};
		// }
	}

	const room = rooms.get(roomId);
	const user = await getUserById(userId);

	if (!room)
		return { success: false, message: "Room not found" };

	// if (user.balance < room.entryFee)
	// 	return { success: false, message: "Not enough blobs to enter a room" };

	if (room.maxPlayers && room.players.size >= room.maxPlayers)
		return { success: false, message: "Room is full" };

	if (room.state !== "waiting" && room.state !== "ready")
		return { success: false, message: "Room is not accepting new players" };

	// await payFee(user, room.entryFee);

	const player: RoomPlayer = {
		id: userId,
		username: username,
		isReady: false,
		alias: undefined
	};

	room.players.add(player);
	userRoomMapping.set(userId, roomId);

	// Don't auto-set to ready anymore - let creator decide
	console.log(`Player ${username} joined room ${roomId}. Room now has ${room.players.size} players.`);

	return { success: true };
}

export function leaveRoom(roomId: string, userId: string): { success: boolean; message?: string } {
	const room = rooms.get(roomId);

	if (!room)
	{
		console.log("No room found");
		return { success: false, message: "Room not found" };
	}

	// Find and remove the player
	const playerToRemove = getPlayerFromRoom(room, userId);
	if (!playerToRemove) {
		return { success: false, message: "You are not in this room" };
	}

	const wasCreator = isUserRoomCreator(userId, roomId);
	
	room.players.delete(playerToRemove);
	userRoomMapping.delete(userId);

	// If room is empty, delete it
	if (room.players.size === 0)
	{
		rooms.delete(roomId);
		console.log(`Room ${roomId} deleted - no players remaining`);

		// Stop the game
		// const gameData = gameWorkers.get(roomId);
		// gameWorkers.delete(roomId);
		// gameData?.worker.postMessage({ type: 'stop' });
	}
	// If creator left and there are still players, the first remaining player becomes creator
	else if (wasCreator && room.players.size > 0)
	{
		const newCreator = Array.from(room.players)[0];
		console.log(`Room ${roomId}: Creator left, ${newCreator.username} is now the creator`);
	}

	// Reset to waiting if less than 2 players
	// if (room && room.players.size < 2) {
	// 	room.state = "waiting";
	// } else if (room && room.players.size >= 2) {
	// 	room.state = "ready";
	// }

	console.log(`${userId} left room ${roomId}`);
	return { success: true };
}

export function getUserCurrentRoom(userId: string): string | undefined
{
	return userRoomMapping.get(userId);
}

export function isUserRoomCreator(userId: string, roomId: string): boolean
{
	const room = rooms.get(roomId);
	if (!room || room.players.size === 0) return false;

	const firstPlayer = Array.from(room.players)[0];
	return firstPlayer.id === userId;
}

export function getRoomCreator(roomId: string): RoomPlayer | undefined
{
	const room = rooms.get(roomId);
	if (!room || room.players.size === 0) return undefined;
	
	// First player is the creator
	return Array.from(room.players)[0];
}

export function getRoomDetails(roomId: string): RoomDetails | undefined
{
	const room = rooms.get(roomId);

	if (!room)
		return undefined;

	return {
		id: roomId,
		players: Array.from(room.players),
		creator: getRoomCreator(roomId),
		createdAt: room.createdAt,
		maxPlayers: room.maxPlayers
	};
}

export function getRoomByUserId(userId: string)
{
	const roomId = getUserCurrentRoom(userId);

	if (roomId)
	{
		return rooms.get(roomId);
	}
}

export function getRoomFee(roomId: string): number | undefined
{
	const room = rooms.get(roomId);

	return room?.entryFee;
}

export function getAllRooms(): RoomInfo[]
{
	return Array.from(rooms.values());
}

export function getRoomCount(): number
{
	return rooms.size;
}

export function getUserCount(): number
{
	return userRoomMapping.size;
}

export function markRoomReady(roomId: string, userId: string): { success: boolean; message?: string }
{
	const room = rooms.get(roomId);
	if (!room)
		return { success: false, message: "Room not found" };

	// if (!isUserRoomCreator(userId, roomId))
	// 	return { success: false, message: "Only room creator can mark room as ready" };

	const usr : RoomPlayer | undefined = getPlayerFromRoom(room, userId);
	
	if (usr)
	{
		usr.isReady = true;

		console.log(`Player ${userId} marked as ready`);
		return { success: true, message: "marked ready" };
	}

	return { success: false, message: "not marked ready" };
}

export function markRoomWaiting(roomId: string, userId: string): { success: boolean; message?: string }
{
	const room = rooms.get(roomId);
	if (!room)
		return { success: false, message: "Room not found" };

	// if (!isUserRoomCreator(userId, roomId))
	// 	return { success: false, message: "Only room creator can mark room as waiting" };

	const usr : RoomPlayer | undefined = getPlayerFromRoom(room, userId);

	if (usr)
	{
		usr.isReady = false;

		console.log(`Player ${userId} marked as waiting`);
		return { success: true, message: "marked waiting" };
	}

	return { success: false, message: "not marked as waiting" };
}

function getPlayerFromRoom(room: RoomInfo, userId: string)
	: RoomPlayer | undefined
{
	return Array.from(room.players).find(p => p.id === userId)
}

export function assignAliasToUser(userId: string, alias: string)
{
	const room = getRoomByUserId(userId);

	if (room)
	{
		const user = getPlayerFromRoom(room, userId);

		if (user)
			user.alias = alias;
	}
}