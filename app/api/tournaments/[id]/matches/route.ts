import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import {
  requireManagementApiUser,
  requireManagementApiWriteAccess
} from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const { id } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listTournamentMatches(id));
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }
    const writeAccessError = await requireManagementApiWriteAccess(request);
    if (writeAccessError) {
      return writeAccessError;
    }

    const body = await request.json();
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
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
