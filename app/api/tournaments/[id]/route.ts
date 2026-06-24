import { notFound, ok } from "@/lib/server/api-response";
import { getTournament } from "@/lib/server/mock-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const tournament = getTournament(id);

  if (!tournament) {
    return notFound("Tournament not found");
  }

  return ok(tournament);
}
