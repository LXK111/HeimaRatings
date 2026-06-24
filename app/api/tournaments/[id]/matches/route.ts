import { badRequest, created, ok } from "@/lib/server/api-response";
import {
  createMatchDraft,
  listTournamentMatches
} from "@/lib/server/mock-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return ok(listTournamentMatches(id));
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    return created(createMatchDraft(id, body));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid match payload");
  }
}
