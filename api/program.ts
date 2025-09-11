import buildServer from "./server.ts";

const server = await buildServer()

async function main()
{
	try
	{
		await server.listen({ port: process.env.PORT as string | undefined });
	}
	catch (e)
	{
		console.error(e);
		process.exit(1);
	}
}

main();