import { FastifyRequest, FastifyReply, fastify } from "fastify";
import userRoutes from "./routes/userRoutes.ts";
import fjwt, { JWT } from "@fastify/jwt";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import fastifyStatic from '@fastify/static';
import path from 'path';
import { gameSocketRoutes } from "./routes/gameSocketRoutes.ts";
import { fastifyCookie } from "@fastify/cookie"
import { Server } from "socket.io";
import fastifyCors from "@fastify/cors";
import fastifyUwsPlugin from '@geut/fastify-uws/plugin'
import { serverFactory } from '@geut/fastify-uws'
// add refresh tokens

declare module "@fastify/jwt"
{
	interface FastifyJWT
	{
		user:
		{
			id: number;
			email: string;
			name: string;
		};
	}
}

function buildServer()
{
	const server = fastify({serverFactory})
		.withTypeProvider<ZodTypeProvider>();

	server.register(fastifyCors,
	{
		origin: "http://localhost:3000",
		credentials: true
	});

	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.register(fastifyCookie);
	// server.register(fastifySocketIO);
	server.register(fastifyUwsPlugin);

	server.register(fjwt,
	{
		secret: "ndkandnan78duy9sau87dbndsa89u7dsy789adbMatWazeisMatevYooo",
		sign:
		{
			expiresIn: "15m"
		}
	});

	server.decorate(
		"authenticate",
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const token = request.cookies.accessToken;

				if (!token)
				{
					return reply.code(401).send({ message: "Missing token" });
				}

				request.headers.authorization = `Bearer ${token}`;

				await request.jwtVerify();
			}
			catch (e)
			{
				return reply.send(e);
			}
		}
	);

	server.addHook("preHandler", (req, reply, next) =>
	{
		req.jwt = server.jwt;
		return next();
	});

	server.register(fastifyStatic, {
		root: path.resolve('.'), // Points to D:\files\transcendence\api
		prefix: '/',
	});
	server.register(userRoutes, { prefix: 'api/users' });
	server.register(gameSocketRoutes);


	return server;
}

declare module "fastify"
{
	interface FastifyRequest
	{
		jwt: JWT;
	}
	export interface FastifyInstance
	{
		io: Server<{ str: string}>;
		authenticate: any;
		ws_authenticate: any;
	}
}

export default buildServer