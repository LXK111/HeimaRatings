import type { RankingEngineInput, RankingEngineOutput } from "@/lib/domain/types";
import { calculateRankingEngine } from "@/lib/ranking-engine/calculators";

export async function runRankingEngine(input: RankingEngineInput): Promise<RankingEngineOutput> {
  return calculateRankingEngine(input);
}
