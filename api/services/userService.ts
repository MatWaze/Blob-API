import { CreateUserType } from "../models/userSchema";
import userRepo from "../repositories/userRepository/userFactory";
import bcrypt from "bcrypt";
import { confirmationEmail, getMailClient } from "./emailService";

export async function createUserAsync(user: CreateUserType)
	: Promise<any>
{
	try
	{
		const usr = await userRepo.createUserAsync(user);

		// Send a confirmation email to the newly created user
		await (await getMailClient()).sendMail(
			confirmationEmail(
				usr.username,
				usr.email,
				"http://localhost:3000/api/users",
				usr.emailVerified.nonce
			)
		);

		return usr;
	}
	catch (e: any)
	{
		throw new Error(e);
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
		throw new Error(e);
	}
}

export async function getUserByEmailAsync(email: string)
	: Promise<any>
{
	return await userRepo.getUserByEmailAsync(email);
}

export async function getUserByNonceAsync(nonce: string)
{
	return await userRepo.getUserByNonceAsync(nonce);
}

export async function getUsersAsync() : Promise<any>
{
	return await userRepo.getUsersAsync();
}

export async function verifyPassword(
	providedPass: string,
	realPass: string
)
	: Promise<boolean>
{
	return await bcrypt.compare(providedPass, realPass);
}

export async function setEmailConfirmed(user: any)
	: Promise<void>
{
	await userRepo.confirmEmailAsync(user.id);
}
