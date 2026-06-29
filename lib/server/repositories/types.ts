import type {
  MatchSummary,
  Organization,
  PlayerSummary,
  PublicRankingPagePayload,
  RankingAlgorithm,
  RankingEngineInput,
  RankingEngineOutput,
  RankingRow,
  RankingSnapshotSummary,
  TournamentEventSummary,
  TournamentSummary,
  WeaponType
} from "@/lib/domain/types";

export interface RankingSnapshotPayload extends RankingSnapshotSummary {
  items: RankingRow[];
}

export interface CreateMatchInput {
  eventId: string;
  round: number;
  player1Name: string;
  player2Name: string;
  score1: number;
  score2: number;
}

export interface BuildRankingEngineInputOptions {
  algorithm?: RankingAlgorithm;
  weaponTypeId?: string;
  tournamentId?: string;
  eventId?: string;
}

export interface CreateRankingSnapshotInput {
  tournamentId: string;
  weaponTypeId: string;
  eventId?: string;
  algorithm: RankingAlgorithm;
  sourceHash?: string;
  publishPageId?: string;
}

export interface AppRepository {
  listOrganizations(): Promise<Organization[]>;
  listWeapons(): Promise<WeaponType[]>;
  listPlayers(): Promise<PlayerSummary[]>;
  listTournaments(): Promise<TournamentSummary[]>;
  getTournament(id: string): Promise<TournamentSummary | undefined>;
  listTournamentEvents(tournamentId: string): Promise<TournamentEventSummary[]>;
  listTournamentMatches(tournamentId: string): Promise<MatchSummary[]>;
  createMatch(tournamentId: string, input: CreateMatchInput): Promise<MatchSummary>;
  getRankingSnapshot(snapshotId: string): Promise<RankingSnapshotPayload>;
  buildRankingEngineInput(options: BuildRankingEngineInputOptions): Promise<RankingEngineInput>;
  createRankingSnapshot(
    input: CreateRankingSnapshotInput,
    output: RankingEngineOutput
  ): Promise<RankingSnapshotPayload>;
  getPublicRankingPage(pageId: string): Promise<PublicRankingPagePayload | undefined>;
}
