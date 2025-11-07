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
	password: z
		.string({ error: "Password is required" })
		.min(8, "Password must be at least 8 characters long")
		.max(40, "Password's too long")
		.regex(
			new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!?%&(){}<=>+\-~,._`|;:]).{8,}$/,),
			"Password must contain at least one lowercase letter, one uppercase leter, one digit, and one special character"
		),
	confirmPassword: z.string({ error: "Password confirmation is required"}),
	...userBaseModel
}) 
.refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don not match",
	path: ["confirmPassword"],
});;

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