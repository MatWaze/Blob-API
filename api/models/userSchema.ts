import { z } from 'zod/v4';

const userBaseModel =
{
	email: z.email(),
	username: z.string(
	{
		error: "Username is required",
	})
};

const createUserModel = z.object(
{
	password: z.string(
	{
		error: "Password is required",
	}),
	authMethod: z.string(),
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
	password: z.string(
	{
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

const googleCodeModel = z.object(
{
	code: z.string()
});

const userId = z.object(
{
	userId: z.string()
});

export type CreateUserType = z.infer<typeof createUserModel>;

export type GetUserType = z.infer<typeof getUserModel>;

export type LoginType = z.infer<typeof loginUserModel>;

export type ConfirmEmailType = z.infer<typeof confirmEmailModel>;

export type GoogleCodeType = z.infer<typeof googleCodeModel>;

export type UserIdType = z.infer<typeof userId>;

export const userSchemas =
{
	createUserModel,
	getUserModel,
	loginUserModel,
	getLoginUserModel,
	confirmEmailModel,
	googleCodeModel
};