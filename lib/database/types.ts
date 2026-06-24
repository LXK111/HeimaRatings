import type {
  LifecycleStatus,
  PublicPageTheme,
  RankingAlgorithm,
  TournamentFormat
} from "@/lib/domain/types";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface WeaponTypeRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerRow {
  id: string;
  organization_id: string;
  name: string;
  club: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerWeaponRatingRow {
  id: string;
  player_id: string;
  weapon_type_id: string;
  initial_rating: number;
  current_rating: number;
  rd: number;
  sigma: number;
  matches_count: number;
  wins_count: number;
  losses_count: number;
  draws_count: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentRow {
  id: string;
  organization_id: string;
  name: string;
  format: TournamentFormat;
  status: LifecycleStatus;
  default_algorithm: RankingAlgorithm;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentEventRow {
  id: string;
  tournament_id: string;
  weapon_type_id: string;
  name: string;
  format: TournamentFormat;
  status: LifecycleStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchRow {
  id: string;
  tournament_id: string;
  event_id: string;
  weapon_type_id: string;
  round: number;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  winner_id: string | null;
  played_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RankingSnapshotRow {
  id: string;
  tournament_id: string;
  weapon_type_id: string;
  event_id: string | null;
  algorithm: RankingAlgorithm;
  generated_at: string;
  source_hash: string | null;
  created_at: string;
}

export interface RankingSnapshotItemRow {
  id: string;
  snapshot_id: string;
  player_id: string;
  rank: number;
  rating: number;
  rd: number | null;
  sigma: number | null;
  matches_count: number;
  wins_count: number;
  losses_count: number;
  draws_count: number;
  created_at: string;
}

export interface PublicPageRow {
  id: string;
  organization_id: string;
  page_id: string;
  tournament_id: string;
  snapshot_id: string | null;
  default_weapon_type_id: string | null;
  title: string;
  theme: PublicPageTheme;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTables {
  organizations: OrganizationRow;
  weapon_types: WeaponTypeRow;
  players: PlayerRow;
  player_weapon_ratings: PlayerWeaponRatingRow;
  tournaments: TournamentRow;
  tournament_events: TournamentEventRow;
  matches: MatchRow;
  ranking_snapshots: RankingSnapshotRow;
  ranking_snapshot_items: RankingSnapshotItemRow;
  public_pages: PublicPageRow;
}
