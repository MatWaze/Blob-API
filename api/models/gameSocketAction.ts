export enum GameSocketAction
{
	CREATE_ROOM = "createRoom",
	JOIN_ROOM = "joinRoom",
	GET_ROOMS = "getRooms",
	START_GAME = "startGame",
	GAME_UPDATE = "gameUpdate",
	LEAVE_ROOM = "leaveRoom",
	
	// Response actions
	ROOM_CREATED = "roomCreated",
	JOINED_ROOM = "joinedRoom",
	LEFT_ROOM = "leftRoom",
	GAME_STARTED = "gameStarted",
	GAME_ENDED = "gameEnded",
	ROOMS_LIST = "roomsList",
	ERROR = "error"
}