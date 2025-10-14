export interface IFriendshipRepository
{
	createFriendship(user1Id: string, user2Id: string, initiatorId: string): Promise<any>;
	getFriendshipById(id: string): Promise<any>;
	getFriendshipByUsers(user1Id: string, user2Id: string): Promise<any>;
	updateFriendshipStatus(id: string, status: string): Promise<any>;
	deleteFriendship(id: string): Promise<void>;
	getPendingRequestsForUser(userId: string): Promise<any[]>;
	getFriendsForUser(userId: string): Promise<any[]>;
	getSentRequestsForUser(userId: string): Promise<any[]>;
}