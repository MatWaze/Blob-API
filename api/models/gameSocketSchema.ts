import { z } from "zod";
import { GameSocketAction } from "./gameSocketAction.ts";

// Simplified GameData schema
const gameDataSchema = z.object({
    ballPosition: z.array(z.number()).length(2), // [x, y]
    players: z.array(z.object({
        id: z.string(),
        username: z.string(),
        position: z.array(z.number())
    })).optional(),
    score: z.record(z.string(), z.number()).optional(),
    timestamp: z.number().optional()
});

export const gameSocketSchema =
{
	createRoomModel: z.object({
		action: z.literal(GameSocketAction.CREATE_ROOM),
		data: z.object({
				entryFee: z.number().nonnegative(),
				maxPlayers: z.number().int().positive().optional(),
		}),
	}),
	joinRoomModel: z.object({
		action: z.literal(GameSocketAction.JOIN_ROOM),
		data: z.object({
				roomId: z.string().min(1),
		}),
	}),
	getRoomsModel: z.object({
		action: z.literal(GameSocketAction.GET_ROOMS),
		data: z.object({}).optional(),
	}),
	startGameModel: z.object({
		action: z.literal(GameSocketAction.START_GAME),
		data: z.object({
				roomId: z.string().min(1),
		}),
	}),
	gameUpdateModel: z.object({
		action: z.literal(GameSocketAction.GAME_UPDATE),
		data: z.object({
            dragValue: z.number(), // Only drag value - no gameId needed!
		}),
	}),
	leaveRoomModel: z.object({
		action: z.literal(GameSocketAction.LEAVE_ROOM),
		data: z.object({
				roomId: z.string().min(1),
		}),
	}),
	
	// Response schemas
	roomCreatedModel: z.object({
		action: z.literal(GameSocketAction.ROOM_CREATED),
		message: z.object({
				roomId: z.string(),
		}),
	}),
	joinedRoomModel: z.object({
		action: z.literal(GameSocketAction.JOINED_ROOM),
		message: z.object({
				roomId: z.string(),
		}),
	}),
	gameStartedModel: z.object({
		action: z.literal(GameSocketAction.GAME_STARTED),
		message: z.object({
			gameInfo: z.object({
				id: z.string(),
				roomId: z.string(),
				players: z.array(z.object({
					id: z.string(),
					username: z.string(),
					position: z.array(z.number())
				})),
				state: z.string(),
				gameData: gameDataSchema,
				createdAt: z.string(),
				startedAt: z.string().optional(),
				finishedAt: z.string().optional()
			})
		}),
	}),
	gameUpdateResponseModel: z.object({
		action: z.literal(GameSocketAction.GAME_UPDATE),
		message: z.object({
			gameInfo: z.object({
				id: z.string(),
				roomId: z.string(),
				players: z.array(z.object({
					id: z.string(),
					username: z.string(),
					position: z.array(z.number())
				})),
				state: z.string(),
				gameData: gameDataSchema,
				createdAt: z.string(),
				startedAt: z.string().optional(),
				finishedAt: z.string().optional()
			}),
			updatedByWorker: z.boolean().optional()
		}),
	}),
	roomsListModel: z.object({
		action: z.literal(GameSocketAction.ROOMS_LIST),
		message: z.array(
			z.object({
				id: z.string(),
				entryFee: z.number(),
				players: z.array(z.object({
					id: z.string(),
					username: z.string(),
					position: z.array(z.number())
				})),
				maxPlayers: z.number().optional(),
				state: z.string().optional(),
				createdBy: z.string().optional(), // Keep for backward compatibility
				creatorUsername: z.string().optional(), // Add creator username
				isCurrentRoom: z.boolean().optional(),
				isCreator: z.boolean().optional()
			})
		),
	}),
	errorModel: z.object({
		action: z.literal(GameSocketAction.ERROR),
		message: z.string(),
	}),
};