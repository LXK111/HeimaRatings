import { ok, withServerError } from "@/lib/server/api-response";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const { id } = await context.params;
    const repository = getRepository(readRepositoryContextFromRequest(request));
    return ok(await repository.listTournamentEvents(id));
  });
}
