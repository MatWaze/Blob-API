import { CreateUserType } from "../../models/userSchema.ts";
import { IUserRepository } from "./IUserRepository.ts";
import prisma from "../../prisma/prismaInstance.ts";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export class userRepository implements IUserRepository
{
	async getUserByWalletAddress(address: string) : Promise<any>
	{
		return await prisma.user.findFirst(
		{
			where:
			{
				walletAddress: address
			}
		});
	}

	async getUserByNonceAsync(nonce: string): Promise<any>
	{
		return await prisma.user.findFirst(
		{
			where:
			{
				emailVerified: { nonce: nonce }
			},
			include: { emailVerified: true }
		});
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

	async getUserByEmailAsync(email: string)
	{
		return await prisma.user.findFirst(
		{
			where: { email: email },
			include: { emailVerified: true }
		});
	}

	async createUserAsync(user: {
		email: string,
		username: string,
		password: string,
		authMethod: string
	})
	{
		const { password, authMethod, ...rest } = user;
		console.log(user);
		const saltRounds = 12;
		const salt = await bcrypt.genSalt(saltRounds);
		
		const hashedPassword = await bcrypt.hash(password, salt);
		const nonce = randomBytes(32).toString("hex");

		switch (authMethod)
		{
			case "GOOGLE":
				return await prisma.user.create(
				{
					data:
					{
						...rest,
						authMethod: authMethod,
						password: undefined,
					},
				});
			default:
				return await prisma.user.create(
				{
					data:
					{
						...rest,
						password: hashedPassword,
						authMethod: authMethod,
						emailVerified:
						{
							create: { nonce }
						}
					},
					include: { emailVerified: true }
				});
		}
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

	async updateBalanceAsync(userId: string, amount: number)
	{
		await prisma.user.update(
		{
			where: { id: userId },
			data:
			{
				balance: amount
			}
		})
	}

	async updateWithdrawabalBalanceAsync(userId: string, amount: number)
	{
		await prisma.user.update(
		{
			where: { id: userId },
			data:
			{
				withdrawAmount: amount
			}
		})
	}
}