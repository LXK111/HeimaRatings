import { notFound, ok, withServerError } from "@/lib/server/api-response";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const { pageId } = await context.params;
    const repository = getRepository(readRepositoryContextFromRequest(request));
    const page = await repository.getPublicRankingPage(pageId);
    if (!page) {
      return notFound("Public ranking page not found");
    }

    return ok(page);
  });
}
