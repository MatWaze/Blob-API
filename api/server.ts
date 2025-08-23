import { FastifyRequest, FastifyReply, fastify, FastifyInstance } from 'fastify';
import userRoutes from './routes/userRoutes.ts';
import fjwt, { FastifyJWT, JWT } from '@fastify/jwt';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { gameSocketRoutes } from './routes/gameSocketRoutes.ts';
import { fastifyCookie } from '@fastify/cookie'
import fastifyCors from '@fastify/cors';
import fastifyUwsPlugin from '@geut/fastify-uws/plugin'
import { serverFactory } from '@geut/fastify-uws'
import { saveCookie } from './services/cookieService.ts';
import fastifyMiddie from '@fastify/middie';
import { IncomingMessage, ServerResponse } from 'http';

let server: FastifyInstance;

declare module '@fastify/jwt'
{
	interface FastifyJWT
	{
		id: string;
		email: string;
		username: string;
	}
}

declare module 'fastify'
{
	interface FastifyRequest
	{
		jwt: JWT;
	}
	export interface FastifyInstance
	{
		authenticate: any;
		refreshAccessToken: any;
	}
}

function parseCookies(cookieHeader: string | undefined): Record<string, string>
{
	if (!cookieHeader)
	{
		console.log("No cookies found in request");
		return {};
	}

	try
	{
		return cookieHeader.split(";").reduce((acc, cookie) =>
		{
			const [key, value] = cookie.trim().split("=");
			if (key && value)
				acc[key] = value;
			return acc;
		}, {} as Record<string, string>);
	}
	catch (error)
	{
		console.error("Error parsing cookies:", error);
		return {};
	}
}

// middleware signature: (req, res, next)
function checkAccessTokenMiddleware(req: IncomingMessage, res: ServerResponse & { getHeader?: any; setHeader?: any }, next: (err?: any) => void) {
	try
	{
		const cookies = parseCookies(req.headers.cookie);

		const accessToken = cookies['accessToken'];
		const refreshToken = cookies['refreshToken'];

		// If there's no access token but a refresh token is present, try to mint a new access token
		if (!accessToken && refreshToken && server)
		{
			(async () =>
			{
				try
				{
					// verify refresh token using fastify-jwt instance
					const payload = server!.jwt.verify(refreshToken) as FastifyJWT;

					// create new short-lived access token
					const newAccessToken = server!.jwt.sign(
						{ id: payload.id, username: payload.username, email: payload.email },
						{ expiresIn: '15m' }
					);

					// set Set-Cookie header on raw response
					const maxAge = 15 * 60; // 15 minutes in seconds
					const cookieStr = `accessToken=${encodeURIComponent(newAccessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

					// preserve existing Set-Cookie header(s)
					const existing = res.getHeader && res.getHeader('Set-Cookie');
					if (existing)
					{
						// merge into array
						const merged = Array.isArray(existing) ? existing.concat(cookieStr) : [existing, cookieStr];
						res.setHeader('Set-Cookie', merged);
					}
					else
					{
						res.setHeader && res.setHeader('Set-Cookie', cookieStr);
					}
				}
				catch (err)
				{
					// refresh token invalid/expired — do nothing, downstream handlers will handle auth
					console.log('refresh token verify failed in middleware:', err);
				}
			})().finally(() => next());
			return;
		}

		next();
	}
	catch (err)
	{
		next(err);
	}
}

async function buildServer()
{
	server = fastify({serverFactory})
		.withTypeProvider<ZodTypeProvider>();

	server.decorate(
		'refreshAccessToken',
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			const refreshToken = request.cookies.refreshToken;
			if (!refreshToken)
			{
				reply.clearCookie('accessToken');
				reply.clearCookie('refreshToken');
				return reply.code(401).send({ message: 'Missing refresh token', needsLogin: true });
			}

			try
			{
				const decoded = server.jwt.verify(refreshToken) as FastifyJWT;
				
				const newAccessToken = server.jwt.sign(
					{ id: decoded.id, username: decoded.username, email: decoded.email }, // Fix: Sign payload directly
					{ expiresIn: "15m" }
				);

				saveCookie(reply, 'accessToken', newAccessToken);

				return reply.code(200).send({ 
					message: 'Token refreshed successfully',
					accessToken: newAccessToken 
				});
			}
			catch (refreshError)
			{
				reply.clearCookie('accessToken');
				reply.clearCookie('refreshToken');
				return reply.code(401).send({ 
					message: 'Invalid refresh token', 
					needsLogin: true 
				});
			}
		}
	);

	server.decorate(
		'authenticate',
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const token = request.cookies.accessToken;

				if (!token)
				{
					return reply.code(401).send({ 
						message: 'Missing access token', 
						needsRefresh: true 
					});
				}

				request.headers.authorization = `Bearer ${token}`;
				await request.jwtVerify();
			}
			catch (e)
			{
				return reply.code(401).send({ 
					message: 'Invalid or expired access token', 
					needsRefresh: true 
				});
			}
		}
	);

	server.addHook("preHandler", (req, reply, next) =>
	{
		req.jwt = server.jwt;
		return next();
	});

	
	await server.register(fastifyMiddie);
	await server.register(fastifyCors,
	{
		origin: 'http://localhost:3000',
		credentials: true
	});

	server.use(checkAccessTokenMiddleware);

	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	await server.register(fastifyCookie);
	await server.register(fastifyUwsPlugin);

	await server.register(fjwt,
	{
		secret: 'ndkandnan78duy9sau87dbndsa89u7dsy789adbMatWazeisMatevYooo'
	});


	await server.register(fastifyStatic, {
		root: path.resolve('.'),
		prefix: '/',
	});

	await server.register(userRoutes, { prefix: 'api/users' });
	await server.register(gameSocketRoutes);

	return server;
}

export default buildServer