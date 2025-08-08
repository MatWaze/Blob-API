import { WebSocket, TemplatedApp } from "uWebSockets.js";
import { WebSocketUserData } from "./roomSocketController.ts";
import { isUserRoomCreator, getRoom } from "../services/roomService.ts";
import { createGame, getGameWorker, stopGame } from "../services/gameSocketService.ts";

export function handleStartGame(
	ws: WebSocket<WebSocketUserData>,
	roomId: string,
	userId: string,
	app: TemplatedApp
)
{
	if (!isUserRoomCreator(userId, roomId))
	{
		ws.send(JSON.stringify(
		{
			success: false,
			error: "Only room creator can start game" 
		}));

		return;
	}

	const room = getRoom(roomId);

	if (!room)
	{
		ws.send(JSON.stringify(
		{
			success: false,
			error: "Room not found"
		}));
		return;
	}

	const players = Array.from(room.players).map(p =>
	({
		id: p.id,
		username: p.username
	}));

	const success = createGame(roomId, players);

	if (success)
	{
		ws.send(JSON.stringify(
		{
			success: true,
			message: "Game started"
		}));
		setupGameBroadcaster(roomId, app);
		console.log(`Game started in room ${roomId} by ${userId}`);
	}
	else
	{
		ws.send(JSON.stringify(
		{
			success: false,
			error: "Failed to start game"
		}));
	}
}

function setupGameBroadcaster(roomId: string, app: TemplatedApp)
{
	const worker = getGameWorker(roomId);
	if (!worker)
	{
		console.error(`No worker found for room ${roomId}`);
		return;
	}

	let gameStartNotificationSent = false;

	worker.on('message', async (message) =>
	{
		try
		{
			if (message.type === 'gameState')
			{
				if (!gameStartNotificationSent)
				{
					console.log(`Sending game start notification to room ${roomId}`);
					app.publish(roomId, JSON.stringify(
					{
						type: 'started',
						roomId: roomId
					}));
					gameStartNotificationSent = true;
				}

				const gameStateMessage = JSON.stringify(
				{
					state: message.state.state,
					ballPosition: message.state.ballPosition,
					players: message.state.players.map((p: any) =>
					({
						id: p.id,
						username: p.username,
						position: p.position,
						isActive: p.isActive
					})),
					countdownSeconds: message.state.state === 'countdown' ?
						Math.ceil(message.state.countdownSeconds) : undefined
				});

				app.publish(`game:${roomId}`, gameStateMessage);
			}
			else if (message.type === 'gameFinished')
			{
				await stopGame(roomId, message.gameResult);

				app.publish(roomId, JSON.stringify({
					type: 'finished',
					gameResult: message.gameResult
				}));
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