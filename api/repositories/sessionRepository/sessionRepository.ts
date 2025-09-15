import prismaInstance from '../../prisma/prismaInstance.ts';

export interface GetSessionEntity
{
	sessionId: string;
	userId: string;
	username: string;
	email: string;
	accessToken?: string;
	refreshToken?: string;
}

export interface SessionEntity extends GetSessionEntity
{
	id: string;
}

export interface CreateSessionData
{
	userId: string;
	username: string;
	email: string;
	accessToken?: string;
	refreshToken?: string;
}

export interface UpdateSessionTokenData
{
	accessToken?: string;
}

export class SessionRepository
{
	async createSessionAsync(data: CreateSessionData): Promise<SessionEntity>
	{
		const sessionId = `sess_${data.userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

		const session = await prismaInstance.session.create(
		{
			data: {
				sessionId: sessionId,
				userId: data.userId,
				username: data.username,
				email: data.email,
				accessToken: data.accessToken!,
				refreshToken: data.refreshToken!
			}
		});

		return session;
	}

	async findBySessionIdAsync(sessionId: string): Promise<SessionEntity | null>
	{
		const session = await prismaInstance.session.findUnique(
		{
			where: { sessionId }
		});

		if (!session)
			return null;

		return session;
	}

	async findByUserIdAsync(userId: string): Promise<SessionEntity[]>
	{
		const sessions = await prismaInstance.session.findMany(
		{
			where: { userId }
		});

		return sessions;
	}

	async findAllAsync(): Promise<SessionEntity[]>
	{
		const sessions = await prismaInstance.session.findMany();

		return sessions;
	}

	async deleteBySessionIdAsync(sessionId: string): Promise<boolean>
	{
		await prismaInstance.session.delete(
		{
			where: { sessionId }
		});

		return true;
	}

	async deleteByUserIdAsync(userId: string): Promise<boolean>
	{
		await prismaInstance.session.deleteMany(
		{
			where: { userId }
		});

		return true;
	}

	async doesSessionExistAsync(sessionId: string): Promise<boolean>
	{
		const session = await prismaInstance.session.findUnique(
		{
			where: { sessionId },
			select: { id: true }
		});

		return !!session;
	}

	async updateSessionAccessTokenAsync(
		sessionId: string,
		tok: UpdateSessionTokenData
	) : Promise<void>
	{
		await prismaInstance.session.update(
		{
			where: { sessionId },
			data: tok
		});
	}
}