import { FastifyReply, FastifyRequest } from "fastify";
import { getTournamentsByUser } from "../services/tournamentService.ts";
import { getCurrentUser } from "../services/userService.ts";

export async function getTournamentsByUserAsync(
	request: FastifyRequest,
	response: FastifyReply
)
{
	const user = await getCurrentUser(request.cookies.sessionId!);

	if (user)
	{
		const tournaments = await getTournamentsByUser(user.id);

		if (tournaments)
		{
			return response.code(200).send({ tournaments });
		}
	}

	return response.code(404).send(
	{
		message: "No tournaments found"
	});
}