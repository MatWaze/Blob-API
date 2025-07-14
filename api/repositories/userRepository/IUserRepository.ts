import { CreateUserType } from "../../models/userSchema";

export interface IUserRepository
{
	getUsersAsync() : Promise<any>;
	getUserByEmailAsync(email: string) : Promise<any>;
	getUserByNonceAsync(nonce: string) : Promise<any>;
	confirmEmailAsync(userId: string) : Promise<void>;
	createUserAsync(user: CreateUserType) : Promise<any>
	deleteUserAsync(id: string) : Promise<void>
}