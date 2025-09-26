export type RoomState = "waiting" | "ready";

export type RoomPlayer =
{
	id:			string;
	username:	string;
	isReady:	boolean;
};

export type RoomInfo =
{
	id: string;
	name: string;
	entryFee: number;
	players: Set<RoomPlayer>;
	maxPlayers: number;
	createdAt: Date;
	state: RoomState;
};