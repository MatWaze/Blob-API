interface SessionData {
	userId: string;
	username: string;
	email: string;
	accessToken?: string;
	refreshToken?: string;
	createdAt: Date;
	lastAccessed: Date;
}

class SessionStore {
	private sessions: Map<string, SessionData> = new Map(); // key = sessionId (not userId)

	createSession(userId: string, username: string, email: string, accessToken?: string, refreshToken?: string): string {
		// Generate unique session ID
		const sessionId = `sess_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
		
		const sessionData: SessionData = {
			userId,
			username,
			email,
			accessToken,
			refreshToken,
			createdAt: new Date(),
			lastAccessed: new Date()
		};

		this.sessions.set(sessionId, sessionData); // Use sessionId as key
		console.log(`Session created for user: ${username} (${userId}) with sessionId: ${sessionId}`);
		return sessionId; // Return sessionId
	}

	getSession(sessionId: string): SessionData | null {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return null;
		}

		session.lastAccessed = new Date();
		return session;
	}

	updateSessionTokens(sessionId: string, accessToken?: string, refreshToken?: string): boolean {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return false;
		}

		if (accessToken !== undefined) session.accessToken = accessToken;
		if (refreshToken !== undefined) session.refreshToken = refreshToken;
		session.lastAccessed = new Date();
		
		return true;
	}

	destroySession(sessionId: string): boolean {
		const deleted = this.sessions.delete(sessionId);
		console.log(`Session destroyed: ${sessionId}, success: ${deleted}`);
		return deleted;
	}

	getAllSessions(): Map<string, SessionData> {
		return new Map(this.sessions);
	}
}

export const sessionStore = new SessionStore();