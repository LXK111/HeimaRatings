import type { MatchSummary, RankingRow } from "@/lib/domain/types";
import {
  appendMatchDrafts,
  buildRankingEngineInput,
  createMatchDraft,
  getPublicRankingPage,
  getRankingSnapshot,
  listPublicRankingPages,
  getTournament,
  listTournamentEventEntries,
  listPlayers,
  listTournamentEvents,
  listTournamentMatches,
  listTournaments,
  listWeapons,
  updateMatchResultDraft
} from "@/lib/server/mock-repository";
import type {
  AppRepository,
  BuildRankingEngineInputOptions,
  CreateMatchInput,
  CreatePlayerInput,
  CreateRankingSnapshotInput,
  CreateTournamentEventEntryInput,
  CreateTournamentEventInput,
  CreateTournamentInput,
  CreateWeaponInput,
  RankingSnapshotPayload,
  TournamentEventRankingSnapshot,
  UpdateMatchResultInput,
  UpdatePlayerInput,
  UpdateTournamentEventEntryInput,
  UpdateTournamentEventInput,
  UpdateTournamentInput,
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

  async createTournament(input: CreateTournamentInput) {
    return {
      id: `tournament-mock-${Date.now()}`,
      name: input.name,
      format: input.format,
      status: input.status,
      eventCount: 0,
      matchCount: 0,
      defaultAlgorithm: input.defaultAlgorithm,
      startedAt: input.startedAt,
      endedAt: input.endedAt
    };
  }

  async updateTournament(input: UpdateTournamentInput) {
    const existing = listTournaments().find((tournament) => tournament.id === input.id);
    if (!existing) {
      throw new Error("Tournament not found");
    }

    return {
      ...existing,
      name: input.name ?? existing.name,
      format: input.format ?? existing.format,
      status: input.status ?? existing.status,
      defaultAlgorithm: input.defaultAlgorithm ?? existing.defaultAlgorithm,
      startedAt: input.startedAt ?? existing.startedAt,
      endedAt: input.endedAt ?? existing.endedAt
    };
  }

  async getTournament(id: string) {
    return getTournament(id);
  }

  async listTournamentEvents(tournamentId: string) {
    return listTournamentEvents(tournamentId);
  }

  async createTournamentEvent(tournamentId: string, input: CreateTournamentEventInput) {
    return {
      id: `event-mock-${Date.now()}`,
      tournamentId,
      weaponTypeId: input.weaponTypeId,
      name: input.name,
      format: input.format,
      status: input.status,
      matchCount: 0
    };
  }

  async updateTournamentEvent(tournamentId: string, input: UpdateTournamentEventInput) {
    const existing = listTournamentEvents(tournamentId).find((event) => event.id === input.id);
    if (!existing) {
      throw new Error("Tournament event not found");
    }

    return {
      ...existing,
      name: input.name ?? existing.name,
      weaponTypeId: input.weaponTypeId ?? existing.weaponTypeId,
      format: input.format ?? existing.format,
      status: input.status ?? existing.status
    };
  }

  async listTournamentEventEntries(_tournamentId: string, eventId: string) {
    return listTournamentEventEntries(eventId);
  }

  async createTournamentEventEntry(
    _tournamentId: string,
    eventId: string,
    input: CreateTournamentEventEntryInput
  ) {
    const player = listPlayers().find((item) => item.id === input.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    return {
      id: `entry-mock-${Date.now()}`,
      eventId,
      playerId: player.id,
      playerName: player.name,
      playerClub: player.club,
      seed: input.seed,
      status: "registered" as const
    };
  }

  async updateTournamentEventEntry(
    _tournamentId: string,
    eventId: string,
    input: UpdateTournamentEventEntryInput
  ) {
    const existing = listTournamentEventEntries(eventId).find((entry) => entry.id === input.id);
    if (!existing) {
      throw new Error("Tournament event entry not found");
    }

    return {
      ...existing,
      seed: input.seed ?? existing.seed,
      status: input.status ?? existing.status
    };
  }

  async listTournamentMatches(tournamentId: string) {
    return listTournamentMatches(tournamentId);
  }

  async createMatch(tournamentId: string, input: CreateMatchInput) {
    return createMatchDraft(tournamentId, input);
  }

  async updateMatchResult(tournamentId: string, input: UpdateMatchResultInput) {
    const match = listTournamentMatches(tournamentId).find((item) => item.id === input.id);
    if (!match) {
      throw new Error("Match not found");
    }
    validateMatchResultInput(match, input);

    return updateMatchResultDraft(tournamentId, input);
  }

  async generateTournamentEventBracket(tournamentId: string, eventId: string) {
    const event = listTournamentEvents(tournamentId).find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Tournament event not found");
    }
    if (listTournamentMatches(tournamentId).some((match) => match.eventId === eventId)) {
      throw new Error("Tournament event already has matches");
    }

    const entries = listTournamentEventEntries(eventId)
      .filter((entry) => entry.status === "registered")
      .sort(compareEntriesBySeed);
    if (entries.length < 2) {
      throw new Error("At least two registered entries are required");
    }

    const pairs = event.format === "single_elimination"
      ? buildSingleEliminationPairs(entries)
      : event.format === "round_robin"
        ? buildRoundRobinPairs(entries)
        : undefined;
    if (!pairs) {
      throw new Error("Bracket generation is only available for single elimination and round robin events");
    }

    const drafts = pairs.map(([player1, player2], index) => ({
      id: `match-bracket-mock-${Date.now()}-${index + 1}`,
      tournamentId,
      eventId,
      weaponTypeId: event.weaponTypeId,
      round: 1,
      player1Id: player1.playerId,
      player1Name: player1.playerName,
      player2Id: player2.playerId,
      player2Name: player2.playerName,
      score1: 0,
      score2: 0,
      winnerName: "平局"
    }));
    return appendMatchDrafts(drafts);
  }

  async advanceTournamentEventBracket(tournamentId: string, eventId: string) {
    const event = listTournamentEvents(tournamentId).find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Tournament event not found");
    }
    if (event.format !== "single_elimination") {
      throw new Error("Bracket advancement is only available for single elimination events");
    }

    const eventMatches = listTournamentMatches(tournamentId).filter((match) => match.eventId === eventId);
    if (eventMatches.length === 0) {
      throw new Error("Tournament event has no matches");
    }

    const currentRound = Math.max(...eventMatches.map((match) => match.round));
    const currentRoundMatches = eventMatches.filter((match) => match.round === currentRound);
    const winners = currentRoundMatches.map(getCompletedMatchWinner);
    if (winners.length !== currentRoundMatches.length) {
      throw new Error("Current round must be completed before advancing");
    }
    if (winners.length < 2) {
      throw new Error("Tournament event already has a champion");
    }
    if (winners.length % 2 !== 0) {
      throw new Error("Odd winner count requires explicit bye placement");
    }

    return appendMatchDrafts(
      buildNextRoundMatches(tournamentId, eventId, event.weaponTypeId, currentRound + 1, winners)
    );
  }

  async getRankingSnapshot(snapshotId: string) {
    return getRankingSnapshot(snapshotId);
  }

  async listTournamentEventRankingSnapshots(tournamentId: string): Promise<TournamentEventRankingSnapshot[]> {
    const events = listTournamentEvents(tournamentId);
    return events
      .filter((event) => event.matchCount > 0)
      .map((event) => {
        const rows = buildMockEventRankingRows(event.weaponTypeId);
        const leader = rows[0];
        return {
          id: `snapshot-${event.id}-latest`,
          eventId: event.id,
          eventName: event.name,
          weaponTypeId: event.weaponTypeId,
          algorithm: "hybrid" as const,
          generatedAt: new Date().toISOString(),
          leaderName: leader?.name ?? "暂无排名",
          leaderRating: leader?.rating ?? 0,
          items: rows
        };
      });
  }

  async buildRankingEngineInput(options: BuildRankingEngineInputOptions) {
    return buildRankingEngineInput(
      options.algorithm,
      options.weaponTypeId,
      options.tournamentId,
      options.eventId
    );
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

  async listPublicRankingPages() {
    return listPublicRankingPages();
  }

  async getPublicRankingPage(pageId: string) {
    return getPublicRankingPage(pageId);
  }
}

type MockBracketEntry = Awaited<ReturnType<typeof listTournamentEventEntries>>[number];

function compareEntriesBySeed(a: MockBracketEntry, b: MockBracketEntry) {
  const seedA = a.seed ?? Number.MAX_SAFE_INTEGER;
  const seedB = b.seed ?? Number.MAX_SAFE_INTEGER;
  if (seedA !== seedB) {
    return seedA - seedB;
  }

  return a.playerName.localeCompare(b.playerName);
}

function buildSingleEliminationPairs(entries: MockBracketEntry[]) {
  const pairs: Array<[MockBracketEntry, MockBracketEntry]> = [];
  let left = 0;
  let right = entries.length - 1;
  while (left < right) {
    pairs.push([entries[left], entries[right]]);
    left += 1;
    right -= 1;
  }

  return pairs;
}

function buildRoundRobinPairs(entries: MockBracketEntry[]) {
  const pairs: Array<[MockBracketEntry, MockBracketEntry]> = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      pairs.push([entries[i], entries[j]]);
    }
  }

  return pairs;
}

function buildMockEventRankingRows(weaponTypeId: string): RankingRow[] {
  return listPlayers()
    .map((player) => {
      const rating = player.weaponRatings.find((item) => item.weaponTypeId === weaponTypeId);
      if (!rating) {
        return null;
      }

      return {
        playerId: player.id,
        name: player.name,
        club: player.club,
        rank: rating.rank,
        rating: rating.rating,
        matches: 0,
        wins: 0,
        losses: 0
      };
    })
    .filter((row): row is RankingRow => Boolean(row))
    .sort((a, b) => a.rank - b.rank);
}

function validateMatchResultInput(match: MatchSummary, input: UpdateMatchResultInput) {
  if (!Number.isFinite(input.score1) || !Number.isFinite(input.score2)) {
    throw new Error("score1 and score2 must be numbers");
  }
  if (input.score1 < 0 || input.score2 < 0) {
    throw new Error("score1 and score2 must be non-negative");
  }
  if (input.score1 === input.score2) {
    throw new Error("Single elimination matches require a winner");
  }
  if (![match.player1Id, match.player2Id].includes(input.winnerId)) {
    throw new Error("winnerId must be one of match players");
  }
}

function getCompletedMatchWinner(match: MatchSummary) {
  if (!match.winnerId || match.winnerName === "平局") {
    return undefined;
  }
  if (match.score1 === match.score2) {
    return undefined;
  }

  return {
    id: match.winnerId,
    name: match.winnerName
  };
}

function buildNextRoundMatches(
  tournamentId: string,
  eventId: string,
  weaponTypeId: string,
  round: number,
  winners: Array<{ id: string; name: string } | undefined>
) {
  const completedWinners = winners.filter((winner): winner is { id: string; name: string } => Boolean(winner));
  const matches: MatchSummary[] = [];
  for (let i = 0; i + 1 < completedWinners.length; i += 2) {
    const player1 = completedWinners[i];
    const player2 = completedWinners[i + 1];
    matches.push({
      id: `match-advance-mock-${Date.now()}-${i + 1}`,
      tournamentId,
      eventId,
      weaponTypeId,
      round,
      player1Id: player1.id,
      player1Name: player1.name,
      player2Id: player2.id,
      player2Name: player2.name,
      score1: 0,
      score2: 0,
      winnerName: "平局"
    });
  }

  return matches;
}
