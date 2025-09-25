import { Worker } from 'worker_threads';

export interface GameResult
{
	players: Array<{
		id: string;
		username: string;
		place: string;
		playersKicked: number;
		isActive: boolean;
		score: number
	}>;
	state: 'finished' | 'aborted';
	fee: number
}

export interface GamePlayer
{
	id: string;
	username: string;
	position: number;
	x: number;
	y: number;
	isActive: boolean;
	place: string,
	playersKicked: number
	prevX?: number,
	prevY?: number;
	velocityX?: number;
	velocityY?: number;
}

export interface GameState
{
	roomId: string;
	state: 'countdown' | 'playing' | 'finished';
	ballPosition: [number, number];
	ballVelocity: [number, number];
	players: GamePlayer[];
	countdownSeconds: number;
	whoHitTheBall: GamePlayer | undefined
}

export interface GameWorkerData
{
	worker: Worker;
	roomId: string;
	players: Array<{id: string, username: string}>;
	createdAt: Date;
}
