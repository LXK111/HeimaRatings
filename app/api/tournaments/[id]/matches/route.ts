import { badRequest, created, ok } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const repository = getRepository();
  return ok(await repository.listTournamentMatches(id));
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const repository = getRepository();
    return created(await repository.createMatch(id, body));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid match payload");
  }
}
