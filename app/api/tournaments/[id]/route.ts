import { notFound, ok, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRepository } from "@/lib/server/repositories/factory";

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
    const repository = getRepository(await readAuthorizedRepositoryContextFromRequest(request));
    const tournament = await repository.getTournament(id);

    if (!tournament) {
      return notFound("Tournament not found");
    }

    return ok(tournament);
  });
}
