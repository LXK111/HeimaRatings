export type RankingAlgorithm = "elo" | "sdr" | "glicko2" | "hybrid";
export type TournamentFormat = "single_elimination" | "round_robin" | "swiss" | "custom";
export type LifecycleStatus = "draft" | "active" | "completed";
export type TournamentEventEntryStatus = "registered" | "withdrawn";
export type PublicPageTheme = "dark" | "light" | "compact";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationRole = "admin" | "editor" | "viewer";

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
}

export interface WeaponType {
  id: string;
  organizationId?: string;
  name: string;
  slug: string;
  enabled: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Player {
  id: string;
  organizationId: string;
  name: string;
  club?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerWeaponRating {
  id: string;
  playerId: string;
  weaponTypeId: string;
  initialRating: number;
  currentRating: number;
  rd: number;
  sigma: number;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  organizationId: string;
  name: string;
  format: TournamentFormat;
  status: LifecycleStatus;
  defaultAlgorithm: RankingAlgorithm;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentEvent {
  id: string;
  tournamentId: string;
  weaponTypeId: string;
  name: string;
  format: TournamentFormat;
  status: LifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecord {
  id: string;
  tournamentId: string;
  eventId: string;
  weaponTypeId: string;
  round: number;
  player1Id: string;
  player2Id: string;
  score1: number;
  score2: number;
  winnerId?: string;
  playedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankingSnapshot {
  id: string;
  tournamentId: string;
  weaponTypeId: string;
  eventId?: string;
  algorithm: RankingAlgorithm;
  generatedAt: string;
  sourceHash?: string;
  createdAt: string;
}

export interface RankingSnapshotItem {
  id: string;
  snapshotId: string;
  playerId: string;
  rank: number;
  rating: number;
  rd?: number;
  sigma?: number;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;
  createdAt: string;
}

export interface PublicPage {
  id: string;
  organizationId: string;
  pageId: string;
  tournamentId: string;
  snapshotId?: string;
  defaultWeaponTypeId?: string;
  title: string;
  theme: PublicPageTheme;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicRankingPageSummary {
  pageId: string;
  title: string;
  enabled: boolean;
  theme: PublicPageTheme;
  tournamentId: string;
  defaultWeaponTypeId?: string;
  updatedAt?: string;
}

export interface RankingEnginePlayerInput {
  id: string;
  name: string;
  rating: number;
  rd?: number;
  sigma?: number;
}

export interface RankingEngineMatchInput {
  id: string;
  round: number;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
}

export interface RankingEngineInput {
  tournamentId: string;
  weaponTypeId: string;
  eventId?: string;
  algorithm: RankingAlgorithm;
  players: RankingEnginePlayerInput[];
  matches: RankingEngineMatchInput[][];
}

export interface RankingEngineOutput {
  algorithm: RankingAlgorithm;
  generatedAt: string;
  rankings: Array<{
    playerId: string;
    name: string;
    rank: number;
    rating: number;
    rd?: number;
    sigma?: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
}

export interface PlayerSummary {
  id: string;
  name: string;
  club: string;
  weaponRatings: Array<{
    weaponTypeId: string;
    rating: number;
    rank: number;
  }>;
}

export interface TournamentSummary {
  id: string;
  name: string;
  format: TournamentFormat;
  status: "draft" | "active" | "completed";
  eventCount: number;
  matchCount: number;
  defaultAlgorithm: RankingAlgorithm;
  startedAt?: string;
  endedAt?: string;
}

export interface TournamentEventSummary {
  id: string;
  tournamentId: string;
  weaponTypeId: string;
  name: string;
  format: TournamentFormat;
  status: LifecycleStatus;
  matchCount: number;
}

export interface TournamentEventEntrySummary {
  id: string;
  eventId: string;
  playerId: string;
  playerName: string;
  playerClub: string;
  seed?: number;
  status: TournamentEventEntryStatus;
}

export interface BracketSlotSummary {
  id: string;
  eventId: string;
  round: number;
  slotIndex: number;
  playerId?: string;
  playerName?: string;
  sourceMatchId?: string;
  sourceMatchLabel?: string;
  status: "empty" | "occupied" | "bye" | "advanced";
}

export interface MatchSummary {
  id: string;
  tournamentId: string;
  eventId: string;
  weaponTypeId: string;
  round: number;
  player1Id?: string;
  player1Name: string;
  player2Id?: string;
  player2Name: string;
  score1: number;
  score2: number;
  winnerId?: string;
  winnerName: string;
  playedAt?: string;
}

export interface RankingSnapshotSummary {
  id: string;
  weaponTypeId: string;
  algorithm: RankingAlgorithm;
  generatedAt: string;
  leaderName: string;
  leaderRating: number;
}

export interface RankingRow {
  playerId: string;
  name: string;
  club: string;
  rank: number;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
}

export interface PublicRankingPagePayload {
  pageId: string;
  title: string;
  enabled: boolean;
  theme: PublicPageTheme;
  defaultWeaponTypeId: string;
  weapons: WeaponType[];
  rankingsByWeapon: Record<string, RankingRow[]>;
  algorithm: RankingAlgorithm;
  generatedAt?: string;
  publicUrl: string;
  embedUrl: string;
  iframeCode: string;
}
