import { notFound, ok } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { pageId } = await context.params;
  const repository = getRepository();
  const page = await repository.getPublicRankingPage(pageId);
  if (!page) {
    return notFound("Public ranking page not found");
  }

  return ok(page);
}
