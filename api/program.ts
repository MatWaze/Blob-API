import buildServer from "./server.ts";

const server = await buildServer()

async function main()
{
	try
	{
		await server.listen({ port: 4000 });
	}
	catch (e)
	{
		console.error(e);
		process.exit(1);
	}
}

main();