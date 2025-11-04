import userRepo from "../repositories/userRepository/userFactory.ts";
import bcrypt from "bcrypt";
import { confirmationEmail, getMailClient } from "./emailService.ts";
import { getSession } from "./sessionService.ts";

export async function sendEmailAsync(usr: any)
	: Promise<any>
{
	try
	{
		const mail = await getMailClient();
		
		await mail.sendMail(
			confirmationEmail(
				usr.username,
				usr.email,
				"http://localhost:4000/api/users",
				usr.emailVerified.nonce
			)
		);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function createUserAsync(user:
	{
		email: string,
		username: string,
		password: string,
		authMethod: string
	}
) : Promise<any>
{
	try
	{
		console.log(user);
		const usr = await userRepo.createUserAsync(user);

		if (user.authMethod != "GOOGLE")
			await sendEmailAsync(usr);

		return usr;
	}
	catch (e: any)
	{
		console.log(e);
	}
}

export async function deleteUserAsync(id: string)
	: Promise<void>
{
	try
	{
		await userRepo.deleteUserAsync(id);
	}
	catch (e: any)
	{
		console.log(e);
	}
}

export async function getUserByEmailAsync(email: string)
	: Promise<any>
{
	try
	{
		return await userRepo.getUserByEmailAsync(email);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function getUserByWalletAddress(address: string)
	: Promise<any>
{
	try
	{
		return await userRepo.getUserByWalletAddress(address);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function getUserByNonceAsync(nonce: string)
	: Promise<any>
{
	try
	{
		return await userRepo.getUserByNonceAsync(nonce);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function getCurrentUser(sessionId: string)
{
	if (sessionId)
	{
		const s = await getSession(sessionId);
	
		if (s !== undefined)
		{
			return await getUserByEmailAsync(s.email);
		}
	}
}

export async function getUsersAsync() : Promise<any>
{
	try
	{
		return await userRepo.getUsersAsync();
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function verifyPassword(
	providedPass: string,
	realPass: string
) : Promise<any>
{
	try
	{
		return await bcrypt.compare(providedPass, realPass);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function setEmailConfirmed(user: any)
	: Promise<void>
{
	try
	{
		await userRepo.confirmEmailAsync(user.id);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function updateBalance(user: any, amount: number)
	: Promise<void>
{
	try
	{
		await userRepo.updateBalanceAsync(user.id, amount);
	}
	catch (error)
	{
		console.log(error);
	}
}

export async function updateWithdrawabalBalance(user: any, amount: number)
	: Promise<void>
{
	try
	{
		await userRepo.updateWithdrawabalBalanceAsync(user.id, amount);
	}
	catch (error)
	{
		console.log(error);
	}
}
