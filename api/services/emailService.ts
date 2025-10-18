import nodemailer from "nodemailer";
import { config } from "dotenv";

config()

export async function getMailClient()
{
	const transporter = nodemailer.createTransport(
	{
		service: "gmail",
		host: "smtp.gmail.com",
		port: 465, // 587 before
		secure: false, // make true later
		auth:
		{
			user: process.env.GOOGLE_EMAIL,
			pass: process.env.GOOGLE_APP_PASSWORD,
		},
	});

	return transporter;
}

export const confirmationEmail = (
	name: string,
	email: string,
	apiBaseUrl: string,
	tok: string
) => {
	return {
		from: {
			name: "Matevos",
			address: "test@test.com",
		},
		to: {
			name: name,
			address: email,
		},
		subject: `Test email confirmation`,
		html: `
			<div
			style="
				font-family: sans-serif;
				max-width: 400px;
				margin: 2rem auto;
				padding: 1rem;
				border-radius: 0.5rem;
			"
			>
			<h2>Welcome to Blob!</h2>
			<p style="padding: 1rem 0; line-height: 2rem">
				Click the link below to confirm your email.
			</p>
			<a
				href="${apiBaseUrl}/email/confirm?nonce=${tok}"
				style="
				text-decoration: none;
				background-color: #164293ff;
				color: white;
				padding: 0.5rem 2rem;
				border-radius: 0.3rem;
				font-weight: bold;
				"
			>
				Confirm email
			</a>
		`.trim(),
		};
};