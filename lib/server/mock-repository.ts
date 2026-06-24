import type { RankingAlgorithm, RankingEngineInput } from "@/lib/domain/types";
import {
  matches,
  players,
  rankingSnapshots,
  rankingsByWeapon,
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

export function getPublicRankingPage(pageId: string) {
  const weapon = weaponTypes[0];
  return {
    pageId,
    title: "HEMA 春季积分赛公开榜单",
    weapon,
    algorithm: "hybrid" satisfies RankingAlgorithm,
    generatedAt: rankingSnapshots[0]?.generatedAt,
    items: rankingsByWeapon[weapon.id] ?? []
  };
}

export function createMatchDraft(tournamentId: string, body: unknown) {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }

  const score1 = Number(body.score1);
  const score2 = Number(body.score2);
  const player1Name = String(body.player1Name ?? "");
  const player2Name = String(body.player2Name ?? "");
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

  return {
    id: `match-draft-${Date.now()}`,
    tournamentId: resolveDemoTournamentId(tournamentId),
    eventId: event.id,
    weaponTypeId: event.weaponTypeId,
    round,
    player1Name,
    player2Name,
    score1,
    score2,
    winnerName: score1 >= score2 ? player1Name : player2Name
  };
}

export function buildRankingEngineInput(
  algorithm: RankingAlgorithm = "hybrid",
  weaponTypeId = "weapon-longsword",
  tournamentId = "tournament-001"
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
    .reduce<Record<number, typeof matches>>((acc, match) => {
      acc[match.round] = [...(acc[match.round] ?? []), match];
      return acc;
    }, {});

  return {
    tournamentId,
    weaponTypeId,
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
