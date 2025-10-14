import { IFriendshipRepository } from "./IFriendshipRepository.ts";
import prisma from "../../prisma/prismaInstance.ts";

export class FriendshipRepository implements IFriendshipRepository
{
	async createFriendship(user1Id: string, user2Id: string, initiatorId: string): Promise<any>
	{
		return await prisma.friendship.create({
			data: {
				user1Id,
				user2Id,
				initiatorId,
				status: "PENDING"
			}
		});
	}

	async getFriendshipById(id: string): Promise<any>
	{
		return await prisma.friendship.findUnique({
			where: { id }
		});
	}

	async getFriendshipByUsers(user1Id: string, user2Id: string): Promise<any>
	{
		return await prisma.friendship.findUnique({
			where: {
				user1Id_user2Id: { user1Id, user2Id }
			}
		});
	}

	async updateFriendshipStatus(id: string, status: string): Promise<any>
	{
		return await prisma.friendship.update({
			where: { id },
			data: { status }
		});
	}

	async deleteFriendship(id: string): Promise<void>
	{
		await prisma.friendship.delete({
			where: { id }
		});
	}

	async getPendingRequestsForUser(userId: string): Promise<any[]>
	{
		return await prisma.friendship.findMany({
			where: {
				user2Id: userId,
				status: "PENDING"
			},
			include: {
				user1: {
					select: {
						id: true,
						username: true,
						email: true
					}
				}
			}
		});
	}

	async getFriendsForUser(userId: string): Promise<any[]>
	{
		return await prisma.friendship.findMany({
			where: {
				OR: [
					{ user1Id: userId, status: "ACCEPTED" },
					{ user2Id: userId, status: "ACCEPTED" }
				]
			},
			include: {
				user1: {
					select: {
						id: true,
						username: true,
						email: true
					}
				}
			}
		});
	}

	async getSentRequestsForUser(userId: string): Promise<any[]>
	{
		return await prisma.friendship.findMany({
			where: {
				user1Id: userId,
				status: "PENDING"
			},
			include: {
				user1: {
					select: {
						id: true,
						username: true,
						email: true
					}
				}
			}
		});
	}
}