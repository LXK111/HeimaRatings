import type {
  MatchSummary,
  PublicRankingPagePayload,
  PublicRankingPageSummary,
  RankingAlgorithm,
  RankingEngineInput
} from "@/lib/domain/types";
import {
  matches,
  players,
  rankingSnapshots,
  rankingsByWeapon,
  tournamentEventEntries,
  tournamentEvents,
  tournaments,
  weaponTypes
} from "@/lib/mock/dashboard-data";

export function listWeapons() {
  return weaponTypes;
}

export function listPlayers() {
  return players;
}

export function listTournaments() {
  return tournaments;
}

export function getTournament(id: string) {
  if (id === "demo") {
    return tournaments[0];
  }

  return tournaments.find((tournament) => tournament.id === id);
}

export function listTournamentEvents(tournamentId: string) {
  const resolvedId = resolveDemoTournamentId(tournamentId);
  return tournamentEvents.filter((event) => event.tournamentId === resolvedId);
}

export function listTournamentEventEntries(eventId: string) {
  return tournamentEventEntries.filter((entry) => entry.eventId === eventId);
}

export function listTournamentMatches(tournamentId: string) {
  const resolvedId = resolveDemoTournamentId(tournamentId);
  return matches.filter((match) => match.tournamentId === resolvedId);
}

export function getRankingSnapshot(snapshotId: string) {
  const snapshot = rankingSnapshots.find((item) => item.id === snapshotId) ?? rankingSnapshots[0];
  return {
    ...snapshot,
    items: rankingsByWeapon[snapshot.weaponTypeId] ?? []
  };
}

export function getPublicRankingPage(pageId: string): PublicRankingPagePayload | undefined {
  if (pageId !== "demo") {
    return undefined;
  }

  const enabledWeapons = weaponTypes.filter((weapon) => weapon.enabled);
  const defaultWeaponTypeId = "weapon-longsword";
  const publicUrl = `/public/rankings/${pageId}`;
  const embedUrl = `/embed/rankings/${pageId}`;

  return {
    pageId,
    title: "HEMA 春季积分赛公开榜单",
    enabled: true,
    theme: "dark",
    defaultWeaponTypeId,
    weapons: enabledWeapons,
    rankingsByWeapon: enabledWeapons.reduce<Record<string, typeof rankingsByWeapon[string]>>(
      (acc, weapon) => {
        acc[weapon.id] = rankingsByWeapon[weapon.id] ?? [];
        return acc;
      },
      {}
    ),
    algorithm: "hybrid" satisfies RankingAlgorithm,
    generatedAt: rankingSnapshots[0]?.generatedAt,
    publicUrl,
    embedUrl,
    iframeCode: `<iframe src="${embedUrl}" title="HEMA Rankings" width="100%" height="640" style="border:0;border-radius:24px;"></iframe>`
  };
}

export function listPublicRankingPages(): PublicRankingPageSummary[] {
  const page = getPublicRankingPage("demo");
  if (!page) {
    return [];
  }

  return [
    {
      pageId: page.pageId,
      title: page.title,
      enabled: page.enabled,
      theme: page.theme,
      tournamentId: "demo",
      defaultWeaponTypeId: page.defaultWeaponTypeId,
      updatedAt: page.generatedAt
    }
  ];
}

export function createMatchDraft(tournamentId: string, body: unknown) {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }

  const score1 = Number(body.score1);
  const score2 = Number(body.score2);
  const player1Name = String(body.player1Name ?? "");
  const player2Name = String(body.player2Name ?? "");
  const player1 = players.find((player) => player.name === player1Name);
  const player2 = players.find((player) => player.name === player2Name);
  const round = Number(body.round ?? 1);
  const eventId = String(body.eventId ?? tournamentEvents[0]?.id ?? "");
  const event = tournamentEvents.find((item) => item.id === eventId) ?? tournamentEvents[0];

  if (!player1Name || !player2Name) {
    throw new Error("player1Name and player2Name are required");
  }

  if (player1Name === player2Name) {
    throw new Error("player1Name and player2Name must be different");
  }

  if (!Number.isFinite(round) || round < 1) {
    throw new Error("round must be a positive number");
  }

  if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
    throw new Error("score1 and score2 must be numbers");
  }

  if (score1 < 0 || score2 < 0) {
    throw new Error("score1 and score2 must be non-negative");
  }

  const created = {
    id: `match-draft-${Date.now()}`,
    tournamentId: resolveDemoTournamentId(tournamentId),
    eventId: event.id,
    weaponTypeId: event.weaponTypeId,
    round,
    player1Id: player1?.id,
    player1Name,
    player2Id: player2?.id,
    player2Name,
    score1,
    score2,
    winnerId: score1 >= score2 ? player1?.id : player2?.id,
    winnerName: score1 >= score2 ? player1Name : player2Name,
    playedAt: new Date().toISOString()
  };
  matches.push(created);

  return created;
}

export function updateMatchResultDraft(
  tournamentId: string,
  input: { id: string; score1: number; score2: number; winnerId: string }
) {
  const matchIndex = matches.findIndex(
    (match) => match.tournamentId === resolveDemoTournamentId(tournamentId) && match.id === input.id
  );
  if (matchIndex < 0) {
    throw new Error("Match not found");
  }

  const match = matches[matchIndex];
  if (![match.player1Id, match.player2Id].includes(input.winnerId)) {
    throw new Error("winnerId must be one of match players");
  }
  const updated = {
    ...match,
    score1: input.score1,
    score2: input.score2,
    winnerId: input.winnerId,
    winnerName: input.winnerId === match.player1Id ? match.player1Name : match.player2Name,
    playedAt: new Date().toISOString()
  };
  matches[matchIndex] = updated;

  return updated;
}

export function appendMatchDrafts(drafts: MatchSummary[]) {
  matches.push(...drafts);
  return drafts;
}

export function buildRankingEngineInput(
  algorithm: RankingAlgorithm = "hybrid",
  weaponTypeId = "weapon-longsword",
  tournamentId = "tournament-001",
  eventId?: string
): RankingEngineInput {
  const playerInputs = players
    .map((player) => {
      const weaponRating = player.weaponRatings.find(
        (rating) => rating.weaponTypeId === weaponTypeId
      );

      if (!weaponRating) {
        return null;
      }

      return {
        id: player.id,
        name: player.name,
        rating: weaponRating.rating,
        rd: 220,
        sigma: 0.2
      };
    })
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const groupedMatches = listTournamentMatches(tournamentId)
    .filter((match) => match.weaponTypeId === weaponTypeId)
    .filter((match) => (eventId ? match.eventId === eventId : true))
    .reduce<Record<number, typeof matches>>((acc, match) => {
      acc[match.round] = [...(acc[match.round] ?? []), match];
      return acc;
    }, {});

  return {
    tournamentId,
    weaponTypeId,
    eventId,
    algorithm,
    players: playerInputs,
    matches: Object.keys(groupedMatches)
      .map(Number)
      .sort((a, b) => a - b)
      .map((round) =>
        groupedMatches[round].map((match) => ({
          id: match.id,
          round: match.round,
          player1: match.player1Name,
          player2: match.player2Name,
          score1: match.score1,
          score2: match.score2
        }))
      )
  };
}

function resolveDemoTournamentId(tournamentId: string) {
  return tournamentId === "demo" ? "tournament-001" : tournamentId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
