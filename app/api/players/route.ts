import { ok, withServerError } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

export async function GET() {
  return withServerError(async () => {
    const repository = getRepository();
    return ok(await repository.listPlayers());
  });
}
