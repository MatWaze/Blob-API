import { FastifyRequest, FastifyReply, fastify } from 'fastify';
import userRoutes from './routes/userRoutes.ts';
import fjwt, { FastifyJWT, JWT } from '@fastify/jwt';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { gameSocketRoutes } from './routes/gameSocketRoutes.ts';
import { fastifyCookie } from '@fastify/cookie'
import { Server } from 'socket.io';
import fastifyCors from '@fastify/cors';
import fastifyUwsPlugin from '@geut/fastify-uws/plugin'
import { serverFactory } from '@geut/fastify-uws'
import { saveCookie } from './services/cookieService.ts';

declare module '@fastify/jwt'
{
	interface FastifyJWT
	{
		id: number;
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
		io: Server<{ str: string}>;
		authenticate: any;
		refreshAccessToken: any;
	}
}

function buildServer()
{
	const server = fastify({serverFactory})
		.withTypeProvider<ZodTypeProvider>();

	server.register(fastifyCors,
	{
		origin: 'http://localhost:3000',
		credentials: true
	});

	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.register(fastifyCookie);
	server.register(fastifyUwsPlugin);

	server.register(fjwt,
	{
		secret: 'ndkandnan78duy9sau87dbndsa89u7dsy789adbMatWazeisMatevYooo'
	});

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
					{ decoded }
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

	server.register(fastifyStatic, {
		root: path.resolve('.'),
		prefix: '/',
	});
	server.register(userRoutes, { prefix: 'api/users' });
	server.register(gameSocketRoutes);

	return server;
}

export default buildServer