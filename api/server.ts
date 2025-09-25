import { FastifyRequest, FastifyReply, fastify, FastifyInstance } from 'fastify';
import userRoutes from './routes/userRoutes.ts';
import fjwt, { JWT } from '@fastify/jwt';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { gameSocketRoutes } from './routes/gameSocketRoutes.ts';
import { fastifyCookie } from '@fastify/cookie'
import fastifyCors from '@fastify/cors';
import fastifyUwsPlugin from '@geut/fastify-uws/plugin'
import { serverFactory } from '@geut/fastify-uws'
import blockChainRoutes from './routes/blockChainRoutes.ts';

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

async function buildServer()
{
	server = fastify({serverFactory})
		.withTypeProvider<ZodTypeProvider>();

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

	const CORS_WHITELIST = [
		'http://localhost:4000',
		'http://localhost:3065',
		'http://localhost:3000',
		'https://your-production-domain.com'
	];

	await server.register(fastifyCors, {
		// origin can be a function that fastify-cors calls for each request
		origin: (origin, callback) => {

			// allow requests with no origin (curl, same-origin, mobile apps)
			if (!origin)
				return callback(null, true);

			if (CORS_WHITELIST.includes(origin))
				return callback(null, true);

			// optional: allow subdomains of example.com
			// if (/\.example\.com$/.test(origin)) return callback(null, true);

			return callback(new Error('Not allowed by CORS'), false);
		},
		credentials: true
	});

	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	await server.register(fastifyCookie);
	await server.register(fastifyUwsPlugin);

	await server.register(fjwt,
	{
		secret: 'ndkandnan78duy9sau87dbndsa89u7dsy789adbMatWazeisMatevYooo'
	});


	await server.register(fastifyStatic,
	{
		root: path.resolve('.'),
		prefix: '/',
	});

	await server.register(userRoutes, { prefix: 'api/users' });
	await server.register(blockChainRoutes, { prefix: 'api/blockchain' });
	await server.register(gameSocketRoutes);

	return server;
}

export default buildServer