import { ok, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";

export async function GET(request: Request) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listPlayers());
  });
}
