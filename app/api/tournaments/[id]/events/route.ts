import { ok } from "@/lib/server/api-response";
import { listTournamentEvents } from "@/lib/server/mock-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return ok(listTournamentEvents(id));
}
