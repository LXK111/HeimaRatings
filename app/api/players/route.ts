import { ok, withServerError } from "@/lib/server/api-response";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

export async function GET(request: Request) {
  return withServerError(async () => {
    const repository = getRepository(readRepositoryContextFromRequest(request));
    return ok(await repository.listPlayers());
  });
}
