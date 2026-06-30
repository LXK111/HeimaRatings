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
  CreatePlayerInput,
  CreateRankingSnapshotInput,
  CreateWeaponInput,
  RankingSnapshotPayload,
  UpdatePlayerInput,
  UpdateWeaponInput
} from "@/lib/server/repositories/types";

export class MockRepository implements AppRepository {
  async listOrganizations() {
    return [
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "HEMA Ratings Demo",
        slug: "hema-ratings-demo",
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T00:00:00.000Z"
      }
    ];
  }

  async listUserOrganizationMemberships() {
    return [
      {
        organizationId: "00000000-0000-0000-0000-000000000001",
        organizationName: "HEMA Ratings Demo",
        organizationSlug: "hema-ratings-demo",
        role: "admin" as const
      }
    ];
  }

  async listWeapons() {
    return listWeapons();
  }

  async createWeapon(input: CreateWeaponInput) {
    return {
      id: `weapon-mock-${Date.now()}`,
      organizationId: "00000000-0000-0000-0000-000000000001",
      name: input.name,
      slug: input.slug,
      enabled: input.enabled,
      sortOrder: input.sortOrder ?? 999,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async updateWeapon(input: UpdateWeaponInput) {
    const existing = listWeapons().find((weapon) => weapon.id === input.id);
    if (!existing) {
      throw new Error("Weapon type not found");
    }

    return {
      ...existing,
      name: input.name ?? existing.name,
      slug: input.slug ?? existing.slug,
      enabled: input.enabled ?? existing.enabled,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString()
    };
  }

  async listPlayers() {
    return listPlayers();
  }

  async createPlayer(input: CreatePlayerInput) {
    const now = Date.now();
    const enabledWeapons = listWeapons().filter((weapon) => weapon.enabled);
    return {
      id: `player-mock-${now}`,
      name: input.name,
      club: input.club?.trim() || "未知俱乐部",
      weaponRatings: enabledWeapons.map((weapon, index) => ({
        weaponTypeId: weapon.id,
        rating: input.initialRating ?? 1500,
        rank: index + 1
      }))
    };
  }

  async updatePlayer(input: UpdatePlayerInput) {
    const existing = listPlayers().find((player) => player.id === input.id);
    if (!existing) {
      throw new Error("Player not found");
    }

    return {
      ...existing,
      name: input.name ?? existing.name,
      club: input.club?.trim() || existing.club
    };
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
