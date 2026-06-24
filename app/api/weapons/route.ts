import { ok } from "@/lib/server/api-response";
import { listWeapons } from "@/lib/server/mock-repository";

export async function GET() {
  return ok(listWeapons());
}
