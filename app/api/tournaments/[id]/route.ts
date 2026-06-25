import { notFound, ok } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const repository = getRepository();
  const tournament = await repository.getTournament(id);

  if (!tournament) {
    return notFound("Tournament not found");
  }

  return ok(tournament);
}
