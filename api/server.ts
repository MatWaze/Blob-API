import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import userRoutes from "./routes/userRoutes";
import { userSchemas } from "./models/userSchema";
import fjwt, { JWT } from "@fastify/jwt";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";

declare module "fastify"
{
	interface FastifyRequest
	{
		jwt: JWT;
	}
	export interface FastifyInstance
	{
		authenticate: any;
	}
}

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
	const server = Fastify().withTypeProvider<ZodTypeProvider>();;

	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.register(fjwt,
	{
		secret: "ndkandnan78duy9sau87dbndsa89u7dsy789adb",
		sign:
		{
			expiresIn: "1h"
		}
	});

	server.decorate(
		"authenticate",
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
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

	server.register(userRoutes, { prefix: 'api/users' })
	return server;
}

export default buildServer