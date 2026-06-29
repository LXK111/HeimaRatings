import { createHash } from "node:crypto";
import type { RankingAlgorithm, RankingEngineInput } from "@/lib/domain/types";
import { runRankingEngine } from "@/lib/ranking-engine/adapter";
import { badRequest, ok, serverError } from "@/lib/server/api-response";
import { requireManagementApiUser } from "@/lib/server/auth-guard";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import { getRepository } from "@/lib/server/repositories/factory";

const algorithms = new Set<RankingAlgorithm>(["elo", "sdr", "glicko2", "hybrid"]);

export async function POST(request: Request) {
  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const body = await readOptionalJson(request);
    const algorithm = readAlgorithm(body?.algorithm);
    const weaponTypeId = typeof body?.weaponTypeId === "string" ? body.weaponTypeId : undefined;
    const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId : undefined;
    const eventId = typeof body?.eventId === "string" ? body.eventId : undefined;
    const persistSnapshot = body?.persistSnapshot === true;
    const publishPageId = typeof body?.publishPageId === "string" ? body.publishPageId : undefined;
    const repository = getRepository(readRepositoryContextFromRequest(request));
    const input = !persistSnapshot && isRankingEngineInput(body)
      ? { ...body, algorithm }
      : await repository.buildRankingEngineInput({ algorithm, weaponTypeId, tournamentId, eventId });

    const result = await runRankingEngine(input);
    if (!persistSnapshot) {
      return ok(result);
    }

    const snapshot = await repository.createRankingSnapshot(
      {
        tournamentId: input.tournamentId,
        weaponTypeId: input.weaponTypeId,
        eventId: input.eventId,
        algorithm: input.algorithm,
        sourceHash: createSourceHash(input),
        publishPageId
      },
      result
    );

    return ok({ result, snapshot, publishPageId });
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

function createSourceHash(input: RankingEngineInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
