import { z } from 'zod/v4';

const userBaseModel =
{
	email: z.email(),
	username: z.string({
		error: "Username is required",
	})
};

const createUserModel = z.object(
{
	password: z.string({
		error: "Password is required",
	}),
	...userBaseModel
});

const getUserModel = z.object(
{
	...userBaseModel,
	id: z.string(),
	emailVerified: z.object(
	{
		nonce: z.string()
	})
});

const loginUserModel = z.object(
{
	email: z.email(),
	password: z.string({
		error: "Password is required"
	})
});

const getLoginUserModel = z.object(
{
	accessToken: z.string()
});

const confirmEmailModel = z.object(
{
	nonce: z.string()
});

export type CreateUserType = z.infer<typeof createUserModel>;

export type LoginType = z.infer<typeof loginUserModel>;

export type ConfirmEmailType = z.infer<typeof confirmEmailModel>;

export const userSchemas =
{
	createUserModel,
	getUserModel,
	loginUserModel,
	getLoginUserModel,
	confirmEmailModel
};