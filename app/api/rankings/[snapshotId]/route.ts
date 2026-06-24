import { ok } from "@/lib/server/api-response";
import { getRankingSnapshot } from "@/lib/server/mock-repository";

interface RouteContext {
  params: Promise<{ snapshotId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { snapshotId } = await context.params;
  return ok(getRankingSnapshot(snapshotId));
}
