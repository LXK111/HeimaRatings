import { notFound, ok, withServerError } from "@/lib/server/api-response";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const { id } = await context.params;
    const repository = getRepository(readRepositoryContextFromRequest(request));
    const tournament = await repository.getTournament(id);

    if (!tournament) {
      return notFound("Tournament not found");
    }

    return ok(tournament);
  });
}
