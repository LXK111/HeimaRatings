import { ok } from "@/lib/server/api-response";
import { listPlayers } from "@/lib/server/mock-repository";

export async function GET() {
  return ok(listPlayers());
}
