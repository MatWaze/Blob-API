import qs from "qs";
import axios from "axios";
import { config } from "dotenv";

config();

interface GoogleTokensResult
{
	access_token: string;
	expires_in: Number;
	refresh_token: string;
	scope: string;
	id_token: string;
}

interface GoogleUserResult
{
	id: string;
	email: string;
	verified_email: boolean;
	name: string;
	given_name: string;
	family_name: string;
	picture: string;
	locale: string;
}

export function getGoogleOAuthURL()
{
	const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

	const options =
	{
		redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URL as string,
		client_id: process.env.GOOGLE_CLIENT_ID as string,
		access_type: "offline",
		response_type: "code",
		prompt: "consent",
		scope:
		[
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		].join(" "),
	};

	const qs = new URLSearchParams(options);

	return `${rootUrl}?${qs.toString()}`;
}

export async function getGoogleOAuthTokens(
	{
		code,
	}:
	{
		code: string;
	}): Promise<GoogleTokensResult>
{
	const url = "https://oauth2.googleapis.com/token";

	const values =
	{
		code,
		client_id: process.env.GOOGLE_CLIENT_ID,
		client_secret: process.env.GOOGLE_CLIENT_SECRET,
		redirect_uri: "http://localhost:4000/api/users/oauth/google",
		grant_type: "authorization_code",
	};

	try
	{
		const res = await axios.post<GoogleTokensResult>(
			url,
			qs.stringify(values),
			{
				headers:
				{
					"Content-Type": "application/x-www-form-urlencoded",
				},
			}
		);

		return res.data;
	}
	catch (error: any)
	{
		console.error(error);
		throw new Error(`Failed to fetch Google OAuth tokens: ${error.message}`);
	}
}

export async function getGoogleUser(
{
	id_token,
	access_token,
}:
{
	id_token: string;
	access_token: string;
}): Promise<GoogleUserResult>
{
	try
	{
		const res = await axios.get<GoogleUserResult>(
			`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
			{
				headers: {
				Authorization: `Bearer ${id_token}`,
				},
			}
		);

		return res.data;
	}
	catch (error: any)
	{
		console.error(error.response.data.error);
		throw new Error(error.message);
	}
}