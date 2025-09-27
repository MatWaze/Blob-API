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
	players: Set<RoomPlayer>;
	entryFee: number;
	maxPlayers: number;
	createdAt: Date;
	state: RoomState;
};

export type RoomDetails =
{
	players: Set<RoomPlayer>;
	creator:	RoomPlayer | undefined;
	createdAt: Date;
}