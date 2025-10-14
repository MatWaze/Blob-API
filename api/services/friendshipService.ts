import { FriendshipRepository } from "../repositories/friendshipRepository/friendshipRepository.ts";
import { userRepository } from "../repositories/userRepository/userRepository.ts";

const friendshipRepository = new FriendshipRepository();
const userRepo = new userRepository();

const sortUserIds = (userId1: string, userId2: string): [string, string] =>
{
	return [userId1, userId2].sort() as [string, string];
};

export const sendFriendRequest = async (
	fromUserId: string,
	toUserId: string
): Promise<any> =>
{
	// Validate users exist
	const [fromUser, toUser] = await Promise.all([
		userRepo.getUserByEmailAsync(fromUserId),
		userRepo.getUserByEmailAsync(toUserId)
	]);

	if (!fromUser) {
		throw new Error("Sender user not found");
	}

	if (!toUser) {
		throw new Error("Recipient user not found");
	}

	// Can't send request to yourself
	if (fromUserId === toUserId) {
		throw new Error("Cannot send friend request to yourself");
	}

	// Enforce ordering
	const [user1Id, user2Id] = sortUserIds(fromUserId, toUserId);

	// Check if friendship already exists
	const existing = await friendshipRepository.getFriendshipByUsers(user1Id, user2Id);

	if (existing) {
		if (existing.status === "BLOCKED") {
			throw new Error("Cannot send friend request to blocked user");
		}
		if (existing.status === "PENDING") {
			throw new Error("Friend request already pending");
		}
		if (existing.status === "ACCEPTED") {
			throw new Error("Already friends");
		}
	}

	return await friendshipRepository.createFriendship(user1Id, user2Id, fromUserId);
};

export const acceptFriendRequest = async (
	friendshipId: string,
	userId: string
): Promise<any> =>
{
	const friendship = await friendshipRepository.getFriendshipById(friendshipId);

	if (!friendship) {
		throw new Error("Friend request not found");
	}

	if (friendship.status !== "PENDING") {
		throw new Error("Friend request is not pending");
	}

	// Only the receiver can accept (user2Id or the non-initiator)
	const isReceiver = friendship.initiatorId !== userId && 
		(friendship.user1Id === userId || friendship.user2Id === userId);

	if (!isReceiver) {
		throw new Error("Only the recipient can accept the friend request");
	}

	return await friendshipRepository.updateFriendshipStatus(friendshipId, "ACCEPTED");
};

export const rejectFriendRequest = async (
	friendshipId: string,
	userId: string
): Promise<any> =>
{
	const friendship = await friendshipRepository.getFriendshipById(friendshipId);

	if (!friendship) {
		throw new Error("Friend request not found");
	}

	if (friendship.status !== "PENDING") {
		throw new Error("Friend request is not pending");
	}

	// Only the receiver can reject
	const isReceiver = friendship.initiatorId !== userId && 
		(friendship.user1Id === userId || friendship.user2Id === userId);

	if (!isReceiver) {
		throw new Error("Only the recipient can reject the friend request");
	}

	return await friendshipRepository.updateFriendshipStatus(friendshipId, "REJECTED");
};

export const cancelFriendRequest = async (
	friendshipId: string,
	userId: string
): Promise<void> =>
{
	const friendship = await friendshipRepository.getFriendshipById(friendshipId);

	if (!friendship) {
		throw new Error("Friend request not found");
	}

	if (friendship.status !== "PENDING") {
		throw new Error("Can only cancel pending friend requests");
	}

	// Only the initiator can cancel
	if (friendship.initiatorId !== userId) {
		throw new Error("Only the sender can cancel the friend request");
	}

	await friendshipRepository.deleteFriendship(friendshipId);
};

export const blockUser = async (
	userId: string,
	targetUserId: string
): Promise<any> =>
{
	if (userId === targetUserId) {
		throw new Error("Cannot block yourself");
	}

	const [user1Id, user2Id] = sortUserIds(userId, targetUserId);

	// Check if friendship exists
	const existing = await friendshipRepository.getFriendshipByUsers(user1Id, user2Id);

	if (existing) {
		// Update existing relationship to blocked
		return await friendshipRepository.updateFriendshipStatus(existing.id, "BLOCKED");
	}

	// Create new blocked relationship
	return await friendshipRepository.createFriendship(user1Id, user2Id, userId);
};

export const unblockUser = async (
	userId: string,
	targetUserId: string
): Promise<void> =>
{
	const [user1Id, user2Id] = sortUserIds(userId, targetUserId);

	const friendship = await friendshipRepository.getFriendshipByUsers(user1Id, user2Id);

	if (!friendship) {
		throw new Error("No relationship found with this user");
	}

	if (friendship.status !== "BLOCKED") {
		throw new Error("User is not blocked");
	}

	// Only the blocker can unblock
	if (friendship.initiatorId !== userId) {
		throw new Error("Only the person who blocked can unblock");
	}

	// Delete the blocked relationship
	await friendshipRepository.deleteFriendship(friendship.id);
};

export const removeFriend = async (
	userId: string,
	friendId: string
): Promise<void> =>
{
	const [user1Id, user2Id] = sortUserIds(userId, friendId);

	const friendship = await friendshipRepository.getFriendshipByUsers(user1Id, user2Id);

	if (!friendship) {
		throw new Error("Friendship not found");
	}

	if (friendship.status !== "ACCEPTED") {
		throw new Error("Not currently friends");
	}

	// Either friend can remove the friendship
	if (friendship.user1Id !== userId && friendship.user2Id !== userId) {
		throw new Error("Unauthorized to remove this friendship");
	}

	await friendshipRepository.deleteFriendship(friendship.id);
};

export const getPendingRequests = async (
	userId: string
): Promise<any[]> =>
{
	return await friendshipRepository.getPendingRequestsForUser(userId);
};

export const getFriends = async (
	userId: string
): Promise<any[]> =>
{
	const friendships = await friendshipRepository.getFriendsForUser(userId);

	// Map to return friend details (not the current user)
	return friendships.map(friendship =>
	{
		const friend = friendship.user1Id === userId 
			? { id: friendship.user2Id } // Would need to fetch user2 details
			: friendship.user1;
		
		return {
			friendshipId: friendship.id,
			friend,
			since: friendship.createdAt
		};
	});
};

export const getSentRequests = async (
	userId: string
): Promise<any[]> =>
{
	return await friendshipRepository.getSentRequestsForUser(userId);
};

export const getFriendshipStatus = async (
	userId: string,
	otherUserId: string
): Promise<string | null> =>
{
	const [user1Id, user2Id] = sortUserIds(userId, otherUserId);

	const friendship = await friendshipRepository.getFriendshipByUsers(user1Id, user2Id);

	return friendship ? friendship.status : null;
};