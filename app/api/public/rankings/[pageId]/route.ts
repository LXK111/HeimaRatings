import { notFound, ok } from "@/lib/server/api-response";
import { getPublicRankingPage } from "@/lib/server/mock-repository";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { pageId } = await context.params;
  const page = getPublicRankingPage(pageId);
  if (!page) {
    return notFound("Public ranking page not found");
  }

  return ok(page);
}
