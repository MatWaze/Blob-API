import { FastifyRequest, FastifyReply } from "fastify";
import * as friendshipService from "../services/friendshipService.ts";
import { getSession } from "../services/sessionService.ts";

async function getCurrentUserId(sessionId: string): Promise<string | undefined>
{
	const sessionData = await getSession(sessionId);

	return sessionData?.userId;
}

export const sendFriendRequestHandler = async (
	request: FastifyRequest<{ Body: { toUserId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const fromUserId = await getCurrentUserId(request.cookies.sessionId!);
		if (!fromUserId) return;

		const { toUserId } = request.body;

		if (!toUserId) {
			return response.code(400).send({ error: "toUserId is required" });
		}

		const friendship = await friendshipService.sendFriendRequest(fromUserId, toUserId);

		return response.code(201).send({
			message: "Friend request sent successfully",
			data: friendship
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const acceptFriendRequestHandler = async (
	request: FastifyRequest<{ Params: { friendshipId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { friendshipId } = request.params;

		const friendship = await friendshipService.acceptFriendRequest(friendshipId, userId);

		return response.code(200).send({
			message: "Friend request accepted",
			data: friendship
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const rejectFriendRequestHandler = async (
	request: FastifyRequest<{ Params: { friendshipId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { friendshipId } = request.params;

		const friendship = await friendshipService.rejectFriendRequest(friendshipId, userId);

		return response.code(200).send({
			message: "Friend request rejected",
			data: friendship
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const cancelFriendRequestHandler = async (
	request: FastifyRequest<{ Params: { friendshipId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { friendshipId } = request.params;

		await friendshipService.cancelFriendRequest(friendshipId, userId);

		return response.code(200).send({
			message: "Friend request cancelled"
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const blockUserHandler = async (
	request: FastifyRequest<{ Body: { targetUserId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { targetUserId } = request.body;

		if (!targetUserId) {
			return response.code(400).send({ error: "targetUserId is required" });
		}

		const friendship = await friendshipService.blockUser(userId, targetUserId);

		return response.code(200).send({
			message: "User blocked successfully",
			data: friendship
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const unblockUserHandler = async (
	request: FastifyRequest<{ Body: { targetUserId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { targetUserId } = request.body;

		if (!targetUserId) {
			return response.code(400).send({ error: "targetUserId is required" });
		}

		await friendshipService.unblockUser(userId, targetUserId);

		return response.code(200).send({
			message: "User unblocked successfully"
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const removeFriendHandler = async (
	request: FastifyRequest<{ Params: { friendId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { friendId } = request.params;

		await friendshipService.removeFriend(userId, friendId);

		return response.code(200).send({
			message: "Friend removed successfully"
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const getPendingRequestsHandler = async (
	request: FastifyRequest,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const requests = await friendshipService.getPendingRequests(userId);

		return response.code(200).send({
			data: requests
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const getFriendsHandler = async (
	request: FastifyRequest,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const friends = await friendshipService.getFriends(userId);

		return response.code(200).send({
			data: friends
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const getSentRequestsHandler = async (
	request: FastifyRequest,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const requests = await friendshipService.getSentRequests(userId);

		return response.code(200).send({
			data: requests
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};

export const getFriendshipStatusHandler = async (
	request: FastifyRequest<{ Params: { otherUserId: string } }>,
	response: FastifyReply
) =>
{
	try
	{
		const userId = await getCurrentUserId(request.cookies.sessionId!);
		if (!userId) return;

		const { otherUserId } = request.params;

		const status = await friendshipService.getFriendshipStatus(userId, otherUserId);

		return response.code(200).send({
			status: status || "NONE"
		});
	}
	catch (error: any)
	{
		return response.code(400).send({ error: error.message });
	}
};