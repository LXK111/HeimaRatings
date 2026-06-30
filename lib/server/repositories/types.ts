import type {
  MatchSummary,
  Organization,
  OrganizationMembership,
  PlayerSummary,
  PublicRankingPagePayload,
  LifecycleStatus,
  RankingAlgorithm,
  RankingEngineInput,
  RankingEngineOutput,
  RankingRow,
  RankingSnapshotSummary,
  TournamentEventEntryStatus,
  TournamentEventEntrySummary,
  TournamentEventSummary,
  TournamentFormat,
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

export interface CreateWeaponInput {
  name: string;
  slug: string;
  enabled: boolean;
  sortOrder?: number;
}

export interface UpdateWeaponInput {
  id: string;
  name?: string;
  slug?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface CreatePlayerInput {
  name: string;
  club?: string;
  initialRating?: number;
}

export interface UpdatePlayerInput {
  id: string;
  name?: string;
  club?: string;
}

export interface CreateTournamentInput {
  name: string;
  format: TournamentFormat;
  status: LifecycleStatus;
  defaultAlgorithm: RankingAlgorithm;
  startedAt?: string;
  endedAt?: string;
}

export interface UpdateTournamentInput {
  id: string;
  name?: string;
  format?: TournamentFormat;
  status?: LifecycleStatus;
  defaultAlgorithm?: RankingAlgorithm;
  startedAt?: string;
  endedAt?: string;
}

export interface CreateTournamentEventInput {
  name: string;
  weaponTypeId: string;
  format: TournamentFormat;
  status: LifecycleStatus;
}

export interface UpdateTournamentEventInput {
  id: string;
  name?: string;
  weaponTypeId?: string;
  format?: TournamentFormat;
  status?: LifecycleStatus;
}

export interface CreateTournamentEventEntryInput {
  playerId: string;
  seed?: number;
}

export interface UpdateTournamentEventEntryInput {
  id: string;
  seed?: number;
  status?: TournamentEventEntryStatus;
}

export interface AppRepository {
  listOrganizations(): Promise<Organization[]>;
  listUserOrganizationMemberships(userId: string): Promise<OrganizationMembership[]>;
  listWeapons(): Promise<WeaponType[]>;
  createWeapon(input: CreateWeaponInput): Promise<WeaponType>;
  updateWeapon(input: UpdateWeaponInput): Promise<WeaponType>;
  listPlayers(): Promise<PlayerSummary[]>;
  createPlayer(input: CreatePlayerInput): Promise<PlayerSummary>;
  updatePlayer(input: UpdatePlayerInput): Promise<PlayerSummary>;
  listTournaments(): Promise<TournamentSummary[]>;
  createTournament(input: CreateTournamentInput): Promise<TournamentSummary>;
  updateTournament(input: UpdateTournamentInput): Promise<TournamentSummary>;
  getTournament(id: string): Promise<TournamentSummary | undefined>;
  listTournamentEvents(tournamentId: string): Promise<TournamentEventSummary[]>;
  createTournamentEvent(tournamentId: string, input: CreateTournamentEventInput): Promise<TournamentEventSummary>;
  updateTournamentEvent(tournamentId: string, input: UpdateTournamentEventInput): Promise<TournamentEventSummary>;
  listTournamentEventEntries(tournamentId: string, eventId: string): Promise<TournamentEventEntrySummary[]>;
  createTournamentEventEntry(
    tournamentId: string,
    eventId: string,
    input: CreateTournamentEventEntryInput
  ): Promise<TournamentEventEntrySummary>;
  updateTournamentEventEntry(
    tournamentId: string,
    eventId: string,
    input: UpdateTournamentEventEntryInput
  ): Promise<TournamentEventEntrySummary>;
  listTournamentMatches(tournamentId: string): Promise<MatchSummary[]>;
  createMatch(tournamentId: string, input: CreateMatchInput): Promise<MatchSummary>;
  generateTournamentEventBracket(tournamentId: string, eventId: string): Promise<MatchSummary[]>;
  getRankingSnapshot(snapshotId: string): Promise<RankingSnapshotPayload>;
  buildRankingEngineInput(options: BuildRankingEngineInputOptions): Promise<RankingEngineInput>;
  createRankingSnapshot(
    input: CreateRankingSnapshotInput,
    output: RankingEngineOutput
  ): Promise<RankingSnapshotPayload>;
  getPublicRankingPage(pageId: string): Promise<PublicRankingPagePayload | undefined>;
}
