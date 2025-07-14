import { CreateUserType } from "../../models/userSchema";
import { IUserRepository } from "./IUserRepository";
import prisma from "../../prisma/prismaInstance";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export class userRepository implements IUserRepository
{
	async getUserByNonceAsync(nonce: string): Promise<any>
	{
		return await prisma.user.findFirst(
		{
			where:
			{
				emailVerified: { nonce: nonce }
			},
			include: { emailVerified: true }
		})
	}

	async getUsersAsync(): Promise<any>
	{
		return await prisma.user.findMany(
		{
			select:
			{
				id: true,
				username: true,
				email: true
			}
		});
	};

	async getUserByEmailAsync(email: string): Promise<any>
	{
		return await prisma.user.findFirst(
		{
			where: { email: email },
			include: { emailVerified: true }
		});
	}

	async createUserAsync(user: CreateUserType): Promise<any>
	{
		const { password, ...rest } = user;
		const saltRounds = 12;
		const salt = await bcrypt.genSalt(saltRounds);
		
		const hashedPassword = await bcrypt.hash(password, salt);
		const nonce = randomBytes(32).toString("hex");

		return await prisma.user.create(
		{
			data:
			{
				...rest,
				password: hashedPassword,
				emailVerified:
				{
					create: { nonce }
				}
			},
			include: { emailVerified: true }
		});
	}

	async deleteUserAsync(id: string): Promise<void>
	{
		const user = await prisma.user.findFirst(
		{
			where: { id: id }
		});

		if (!user)
			return;

		await prisma.user.delete(
		{
			where: { id: id }
		});
	}

	async confirmEmailAsync(userId: string): Promise<void>
	{
		await prisma.emailVerified.update(
		{
			where: { userId: userId },
			data:
			{
				isVerified: true,
				nonce: null,
			},
		});
	}
}