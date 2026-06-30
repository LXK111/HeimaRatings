import { badRequest, ok, serverError } from "@/lib/server/api-response";
import {
  requireManagementApiUser,
  requireManagementApiWriteAccess
} from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ id: string; eventId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id, eventId } = await context.params;

  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }
    const writeAccessError = await requireManagementApiWriteAccess(request);
    if (writeAccessError) {
      return writeAccessError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.advanceTournamentEventBracket(id, eventId));
  } catch (error) {
    if (isServerConfigurationError(error)) {
      return serverError(error);
    }

    return badRequest(error instanceof Error ? error.message : "Invalid bracket advancement request");
  }
}

function isServerConfigurationError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Supabase data source is not configured");
}
