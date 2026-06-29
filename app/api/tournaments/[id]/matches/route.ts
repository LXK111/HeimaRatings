import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const { id } = await context.params;
    const repository = getRepository(readRepositoryContextFromRequest(request));
    return ok(await repository.listTournamentMatches(id));
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const repository = getRepository(readRepositoryContextFromRequest(request));
    return created(await repository.createMatch(id, body));
  } catch (error) {
    if (isServerConfigurationError(error)) {
      return serverError(error);
    }

    return badRequest(error instanceof Error ? error.message : "Invalid match payload");
  }
}

function isServerConfigurationError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Supabase data source is not configured");
}
