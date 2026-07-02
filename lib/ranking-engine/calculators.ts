import type {
  RankingAlgorithm,
  RankingEngineInput,
  RankingEngineOutput,
  RankingEnginePlayerInput
} from "@/lib/domain/types";

type Result = 0 | 0.5 | 1;

interface MutableRankingPlayer {
  id: string;
  name: string;
  rating: number;
  rd: number;
  sigma: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
}

interface RankingMatch {
  player1: MutableRankingPlayer;
  player2: MutableRankingPlayer;
  score1: number;
  score2: number;
  result: Result;
  scoreDiff: number;
}

interface GlickoOpponent {
  opponent: MutableRankingPlayer;
  score: number;
}

interface HybridOpponent {
  opponent: MutableRankingPlayer;
  match: RankingMatch;
  isPlayer1: boolean;
}

const defaultRating = 1500;
const defaultRd = 350;
const defaultSigma = 0.2;
const glickoScale = 173.7178;

export function calculateRankingEngine(input: RankingEngineInput): RankingEngineOutput {
  const players = loadPlayers(input.players);

  switch (input.algorithm) {
    case "elo":
      processElo(players, input.matches, false);
      break;
    case "sdr":
      processElo(players, input.matches, true);
      break;
    case "glicko2":
      processGlicko2(players, input.matches, false);
      break;
    case "hybrid":
      processGlicko2(players, input.matches, true);
      break;
    default:
      assertNever(input.algorithm);
  }

  return {
    algorithm: input.algorithm,
    generatedAt: new Date().toISOString(),
    rankings: toRankings(players)
  };
}

function loadPlayers(inputPlayers: RankingEnginePlayerInput[]) {
  return new Map(
    inputPlayers.map((player) => [
      player.name,
      {
        id: player.id,
        name: player.name,
        rating: player.rating ?? defaultRating,
        rd: player.rd ?? defaultRd,
        sigma: player.sigma ?? defaultSigma,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0
      } satisfies MutableRankingPlayer
    ])
  );
}

function processElo(
  players: Map<string, MutableRankingPlayer>,
  rounds: RankingEngineInput["matches"],
  useScoreDifferential: boolean
) {
  for (const round of rounds) {
    for (const matchInput of round) {
      const match = resolveMatch(players, matchInput);
      const newRating1 = calculateEloLikeRating(match.player1, match.player2, match, true, useScoreDifferential);
      const newRating2 = calculateEloLikeRating(match.player2, match.player1, match, false, useScoreDifferential);

      match.player1.rating = newRating1;
      match.player2.rating = newRating2;
      updateRecord(match.player1, match.result);
      updateRecord(match.player2, invertResult(match.result));
    }
  }
}

function calculateEloLikeRating(
  player: MutableRankingPlayer,
  opponent: MutableRankingPlayer,
  match: RankingMatch,
  isPlayer1: boolean,
  useScoreDifferential: boolean
) {
  const expected = calculateExpectedScore(player.rating, opponent.rating);
  const actual = useScoreDifferential
    ? getSdrScore(match, isPlayer1)
    : isPlayer1
      ? match.result
      : invertResult(match.result);
  return player.rating + 32 * (actual - expected);
}

function processGlicko2(
  players: Map<string, MutableRankingPlayer>,
  rounds: RankingEngineInput["matches"],
  useScoreDifferential: boolean
) {
  for (const round of rounds) {
    const glickoOpponents = new Map<string, GlickoOpponent[]>();
    const hybridOpponents = new Map<string, HybridOpponent[]>();
    for (const player of players.values()) {
      glickoOpponents.set(player.name, []);
      hybridOpponents.set(player.name, []);
    }

    for (const matchInput of round) {
      const match = resolveMatch(players, matchInput);
      if (useScoreDifferential) {
        hybridOpponents.get(match.player1.name)?.push({ opponent: match.player2, match, isPlayer1: true });
        hybridOpponents.get(match.player2.name)?.push({ opponent: match.player1, match, isPlayer1: false });
      } else {
        glickoOpponents.get(match.player1.name)?.push({ opponent: match.player2, score: match.result });
        glickoOpponents.get(match.player2.name)?.push({ opponent: match.player1, score: invertResult(match.result) });
      }
      updateRecord(match.player1, match.result);
      updateRecord(match.player2, invertResult(match.result));
    }

    for (const player of players.values()) {
      if (useScoreDifferential) {
        updateHybridPlayer(player, hybridOpponents.get(player.name) ?? []);
      } else {
        updateGlickoPlayer(player, glickoOpponents.get(player.name) ?? []);
      }
    }
  }
}

function updateGlickoPlayer(player: MutableRankingPlayer, opponents: GlickoOpponent[]) {
  if (opponents.length === 0) {
    player.rd = Math.min(Math.sqrt(player.rd ** 2 + player.sigma ** 2), 350);
    return;
  }

  const variance = glickoVariance(player, opponents);
  const delta = glickoDelta(player, opponents, variance);
  applyGlickoUpdate(
    player,
    variance,
    delta,
    (rating) => opponents.reduce((sum, { opponent, score }) => {
      const opponentRd = opponent.rd / glickoScale;
      return sum + g(opponentRd) * (score - expectedGlicko(rating, toGlicko2(opponent.rating), opponentRd));
    }, 0)
  );
}

function updateHybridPlayer(player: MutableRankingPlayer, opponents: HybridOpponent[]) {
  if (opponents.length === 0) {
    player.rd = Math.min(Math.sqrt(player.rd ** 2 + player.sigma ** 2), 350);
    return;
  }

  const variance = hybridVariance(player, opponents);
  const delta = hybridDelta(player, opponents, variance);
  applyGlickoUpdate(
    player,
    variance,
    delta,
    (rating) => opponents.reduce((sum, { opponent, match, isPlayer1 }) => {
      const opponentRd = opponent.rd / glickoScale;
      const adjustedScore = getHybridAdjustedScore(match, isPlayer1);
      return sum + g(opponentRd) * (adjustedScore - expectedGlicko(rating, toGlicko2(opponent.rating), opponentRd));
    }, 0)
  );
}

function applyGlickoUpdate(
  player: MutableRankingPlayer,
  variance: number,
  delta: number,
  scoreAdjustment: (rating: number) => number
) {
  const x = findVolatilityX(player, delta, variance);
  const newSigma = Math.exp(x / 2);
  const rdGlicko = player.rd / glickoScale;
  const preRatingRd = Math.sqrt(1 / (1 / rdGlicko ** 2 + 1 / variance));
  const newRdGlicko = 1 / Math.sqrt(1 / preRatingRd ** 2 + 1 / newSigma ** 2);
  const ratingGlicko = toGlicko2(player.rating);

  player.rating = toOriginalRating(ratingGlicko + newRdGlicko ** 2 * scoreAdjustment(ratingGlicko));
  player.rd = newRdGlicko * glickoScale;
  player.sigma = newSigma;
}

function findVolatilityX(player: MutableRankingPlayer, delta: number, variance: number) {
  let a = Math.log(player.sigma ** 2);
  let b: number;
  const rdGlicko = player.rd / glickoScale;

  if (delta ** 2 > rdGlicko ** 2 + variance) {
    b = Math.log(delta ** 2 - rdGlicko ** 2 - variance);
  } else {
    let k = 1;
    while (volatilityFunction(a - k, player, delta, variance) < 0) {
      k += 1;
    }
    b = a - k;
  }

  let fA = volatilityFunction(a, player, delta, variance);
  let fB = volatilityFunction(b, player, delta, variance);
  while (Math.abs(b - a) > 0.000001) {
    const c = a + ((a - b) * fA) / (fB - fA);
    const fC = volatilityFunction(c, player, delta, variance);

    if (fC * fB < 0) {
      a = b;
      fA = fB;
    } else {
      fA /= 2;
    }
    b = c;
    fB = fC;
  }

  return a;
}

function volatilityFunction(x: number, player: MutableRankingPlayer, delta: number, variance: number) {
  const sigmaSquared = player.sigma ** 2;
  const denominator = sigmaSquared + x;
  if (denominator <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const a = Math.log(sigmaSquared);
  const b = (x - a) / (2 * x ** 2);
  const c = (delta ** 2 - denominator - variance) / (2 * denominator ** 2);
  return Math.exp(x) * (c - b) - (a - x) / denominator;
}

function glickoVariance(player: MutableRankingPlayer, opponents: GlickoOpponent[]) {
  const rating = toGlicko2(player.rating);
  const varianceSum = opponents.reduce((sum, { opponent }) => {
    const opponentRating = toGlicko2(opponent.rating);
    const opponentRd = opponent.rd / glickoScale;
    const opponentG = g(opponentRd);
    const expected = expectedGlicko(rating, opponentRating, opponentRd);
    return sum + opponentG ** 2 * expected * (1 - expected);
  }, 0);
  return 1 / varianceSum;
}

function hybridVariance(player: MutableRankingPlayer, opponents: HybridOpponent[]) {
  const rating = toGlicko2(player.rating);
  const varianceSum = opponents.reduce((sum, { opponent }) => {
    const opponentRating = toGlicko2(opponent.rating);
    const opponentRd = opponent.rd / glickoScale;
    const opponentG = g(opponentRd);
    const expected = expectedGlicko(rating, opponentRating, opponentRd);
    return sum + opponentG ** 2 * expected * (1 - expected);
  }, 0);
  return varianceSum > 0 ? 1 / varianceSum : Number.POSITIVE_INFINITY;
}

function glickoDelta(player: MutableRankingPlayer, opponents: GlickoOpponent[], variance: number) {
  const rating = toGlicko2(player.rating);
  const deltaSum = opponents.reduce((sum, { opponent, score }) => {
    const opponentRating = toGlicko2(opponent.rating);
    const opponentRd = opponent.rd / glickoScale;
    return sum + g(opponentRd) * (score - expectedGlicko(rating, opponentRating, opponentRd));
  }, 0);
  return variance * deltaSum;
}

function hybridDelta(player: MutableRankingPlayer, opponents: HybridOpponent[], variance: number) {
  const rating = toGlicko2(player.rating);
  const deltaSum = opponents.reduce((sum, { opponent, match, isPlayer1 }) => {
    const opponentRating = toGlicko2(opponent.rating);
    const opponentRd = opponent.rd / glickoScale;
    return sum + g(opponentRd) * (
      getHybridAdjustedScore(match, isPlayer1) - expectedGlicko(rating, opponentRating, opponentRd)
    );
  }, 0);
  return variance === Number.POSITIVE_INFINITY ? 0 : variance * deltaSum;
}

function resolveMatch(
  players: Map<string, MutableRankingPlayer>,
  match: RankingEngineInput["matches"][number][number]
): RankingMatch {
  const player1 = players.get(match.player1);
  const player2 = players.get(match.player2);
  if (!player1 || !player2) {
    throw new Error(`Ranking match references unknown player: ${match.player1} vs ${match.player2}`);
  }

  const result = getResult(match.score1, match.score2);
  return {
    player1,
    player2,
    score1: match.score1,
    score2: match.score2,
    result,
    scoreDiff: Math.abs(match.score1 - match.score2)
  };
}

function toRankings(players: Map<string, MutableRankingPlayer>) {
  return Array.from(players.values())
    .sort((left, right) => right.rating - left.rating)
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      rank: index + 1,
      rating: round(player.rating, 2),
      rd: round(player.rd, 2),
      sigma: round(player.sigma, 4),
      matches: player.matches,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws
    }));
}

function updateRecord(player: MutableRankingPlayer, result: number) {
  player.matches += 1;
  if (result === 1) {
    player.wins += 1;
  } else if (result === 0) {
    player.losses += 1;
  } else {
    player.draws += 1;
  }
}

function getResult(score1: number, score2: number): Result {
  if (score1 > score2) {
    return 1;
  }
  if (score1 < score2) {
    return 0;
  }
  return 0.5;
}

function invertResult(result: Result) {
  return result === 0.5 ? 0.5 : result === 1 ? 0 : 1;
}

function getSdrScore(match: RankingMatch, isPlayer1: boolean) {
  const result = isPlayer1 ? match.result : invertResult(match.result);
  if (result === 1) {
    return 1 + 0.05 * match.scoreDiff;
  }
  if (result === 0) {
    return 0 - 0.05 * match.scoreDiff;
  }
  return 0.5;
}

function getHybridAdjustedScore(match: RankingMatch, isPlayer1: boolean) {
  const result = isPlayer1 ? match.result : invertResult(match.result);
  if (result === 1) {
    return Math.min(1 + 0.05 * match.scoreDiff, 2.0);
  }
  if (result === 0) {
    return Math.max(0 - 0.05 * match.scoreDiff, -1.0);
  }
  return 0.5;
}

function calculateExpectedScore(rating1: number, rating2: number) {
  return 1 / (1 + 10 ** ((rating2 - rating1) / 400));
}

function toGlicko2(rating: number) {
  return (rating - 1500) / glickoScale;
}

function toOriginalRating(rating: number) {
  return rating * glickoScale + 1500;
}

function g(rd: number) {
  return 1 / Math.sqrt(1 + (3 * rd ** 2) / Math.PI ** 2);
}

function expectedGlicko(rating: number, opponentRating: number, opponentRd: number) {
  return 1 / (1 + Math.exp(-g(opponentRd) * (rating - opponentRating)));
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported ranking algorithm: ${value as RankingAlgorithm}`);
}
