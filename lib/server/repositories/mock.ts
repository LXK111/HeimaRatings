import type { RankingRow } from "@/lib/domain/types";
import {
  buildRankingEngineInput,
  createMatchDraft,
  getPublicRankingPage,
  getRankingSnapshot,
  getTournament,
  listPlayers,
  listTournamentEvents,
  listTournamentMatches,
  listTournaments,
  listWeapons
} from "@/lib/server/mock-repository";
import type {
  AppRepository,
  BuildRankingEngineInputOptions,
  CreateMatchInput,
  CreateRankingSnapshotInput,
  RankingSnapshotPayload
} from "@/lib/server/repositories/types";

export class MockRepository implements AppRepository {
  async listWeapons() {
    return listWeapons();
  }

  async listPlayers() {
    return listPlayers();
  }

  async listTournaments() {
    return listTournaments();
  }

  async getTournament(id: string) {
    return getTournament(id);
  }

  async listTournamentEvents(tournamentId: string) {
    return listTournamentEvents(tournamentId);
  }

  async listTournamentMatches(tournamentId: string) {
    return listTournamentMatches(tournamentId);
  }

  async createMatch(tournamentId: string, input: CreateMatchInput) {
    return createMatchDraft(tournamentId, input);
  }

  async getRankingSnapshot(snapshotId: string) {
    return getRankingSnapshot(snapshotId);
  }

  async buildRankingEngineInput(options: BuildRankingEngineInputOptions) {
    return buildRankingEngineInput(options.algorithm, options.weaponTypeId, options.tournamentId);
  }

  async createRankingSnapshot(
    input: CreateRankingSnapshotInput
  ): Promise<RankingSnapshotPayload> {
    return {
      id: `snapshot-mock-${Date.now()}`,
      weaponTypeId: input.weaponTypeId,
      algorithm: input.algorithm,
      generatedAt: new Date().toISOString(),
      leaderName: "Mock 模式未保存快照",
      leaderRating: 0,
      items: [] satisfies RankingRow[]
    };
  }

  async getPublicRankingPage(pageId: string) {
    return getPublicRankingPage(pageId);
  }
}
