import { ok } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ snapshotId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { snapshotId } = await context.params;
  const repository = getRepository();
  return ok(await repository.getRankingSnapshot(snapshotId));
}
