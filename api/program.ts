import { config } from "dotenv";
import buildServer from "./server.ts";

config();

const server = await buildServer()

async function main()
{
	try
	{
		await server.listen({ port: process.env.PORT as number | undefined });
		console.log(`Server started on port ${process.env.PORT}`);
	}
	catch (e)
	{
		console.error(e);
		process.exit(1);
	}
}

main();