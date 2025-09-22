import sessionRepo from "../repositories/sessionRepository/sessionFactory.ts";
import { CreateSessionData, GetSessionEntity, UpdateSessionTokenData } from "../repositories/sessionRepository/sessionRepository.ts";

export async function createSession(data: CreateSessionData) : Promise<GetSessionEntity>
{	
	try
	{
		return await sessionRepo.createSessionAsync(data);
	}
	catch (error)
	{
		console.error("Service: Error creating session:", error);
		throw new Error("Failed to create session");
	}
}

export async function getSession(sessionId: string) : Promise<GetSessionEntity>
{
	try
	{
		const session = await sessionRepo.findBySessionIdAsync(sessionId);

		if (!session)
			throw new Error("No session found");

		return session;
	}
	catch (error)
	{
		console.error("Service: Error retrieving session: ", error);
		throw new Error("Failed to get a session");
	}
}

export async function deleteSession(sessionId: string) : Promise<void>
{
	try
	{
		await sessionRepo.deleteBySessionIdAsync(sessionId);
	}
	catch (error)
	{
		throw new Error("Failed to delete a session");
	}
}

export async function deleteSessionByUserId(userId: string) : Promise<void>
{
	try
	{
		await sessionRepo.deleteByUserIdAsync(userId);
	}
	catch (error)
	{
		throw new Error("Failed to delete a session by the user id");
	}
}

export async function updateSessionAccessToken(
	sessionId: string,
	tok: UpdateSessionTokenData
) : Promise<void>
{
	try
	{
		await sessionRepo.updateSessionAccessTokenAsync(sessionId, tok);
	}
	catch (error)
	{
		throw new Error("Failed to update an access token");
	}
}