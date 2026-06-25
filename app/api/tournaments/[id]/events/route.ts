import { ok, withServerError } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  return withServerError(async () => {
    const { id } = await context.params;
    const repository = getRepository();
    return ok(await repository.listTournamentEvents(id));
  });
}
