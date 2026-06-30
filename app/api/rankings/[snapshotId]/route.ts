import { ok, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ snapshotId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const { snapshotId } = await context.params;
    const repository = getRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.getRankingSnapshot(snapshotId));
  });
}
