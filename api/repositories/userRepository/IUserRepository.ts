import { CreateUserType } from "../../models/userSchema.ts";

export interface IUserRepository
{
	getUsersAsync() : Promise<any>;
	getUserByEmailAsync(email: string) : Promise<any>;
	getUserByNonceAsync(nonce: string) : Promise<any>;
	confirmEmailAsync(userId: string) : Promise<void>;
	createUserAsync(user: CreateUserType) : Promise<any>;
	// updateUserAsync(user: any) : Promise<any>;
	deleteUserAsync(id: string) : Promise<void>;
	updateBalanceAsync(userId: string, amount: number) : Promise<void>;
	updateWithdrawabalBalanceAsync(userId: string, amount: number) : Promise<void>;
}