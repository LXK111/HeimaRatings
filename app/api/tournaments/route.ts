import { ok, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser } from "@/lib/server/auth-guard";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

export async function GET(request: Request) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const repository = getRepository(readRepositoryContextFromRequest(request));
    return ok(await repository.listTournaments());
  });
}
