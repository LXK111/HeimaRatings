import type { RankingAlgorithm, RankingEngineInput } from "@/lib/domain/types";
import { runRankingEngine } from "@/lib/ranking-engine/adapter";
import { badRequest, ok, serverError } from "@/lib/server/api-response";
import { getRepository } from "@/lib/server/repositories/factory";

const algorithms = new Set<RankingAlgorithm>(["elo", "sdr", "glicko2", "hybrid"]);

export async function POST(request: Request) {
  try {
    const body = await readOptionalJson(request);
    const algorithm = readAlgorithm(body?.algorithm);
    const weaponTypeId = typeof body?.weaponTypeId === "string" ? body.weaponTypeId : undefined;
    const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId : undefined;
    const repository = getRepository();
    const input = isRankingEngineInput(body)
      ? { ...body, algorithm }
      : await repository.buildRankingEngineInput({ algorithm, weaponTypeId, tournamentId });

    const result = await runRankingEngine(input);
    return ok(result);
  } catch (error) {
    if (error instanceof TypeError) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
}

async function readOptionalJson(request: Request) {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text) as Record<string, unknown>;
}

function readAlgorithm(value: unknown): RankingAlgorithm {
  if (value === undefined) {
    return "hybrid";
  }

  if (typeof value === "string" && algorithms.has(value as RankingAlgorithm)) {
    return value as RankingAlgorithm;
  }

  throw new TypeError("algorithm must be one of elo, sdr, glicko2, hybrid");
}

function isRankingEngineInput(value: unknown): value is RankingEngineInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<RankingEngineInput>;
  return (
    typeof candidate.tournamentId === "string" &&
    typeof candidate.weaponTypeId === "string" &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.matches)
  );
}
