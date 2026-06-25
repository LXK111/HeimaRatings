import { ok } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

export async function GET() {
  const repository = getRepository();
  return ok(await repository.listPlayers());
}
