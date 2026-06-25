import type {
  AppRepository,
  BuildRankingEngineInputOptions,
  CreateMatchInput,
  CreateRankingSnapshotInput
} from "@/lib/server/repositories/types";
import type { RankingEngineOutput } from "@/lib/domain/types";

const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export class SupabaseRepository implements AppRepository {
  constructor() {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Supabase data source is not configured. Missing: ${missing.join(", ")}`);
    }
  }

  async listWeapons() {
    return this.notImplemented("listWeapons");
  }

  async listPlayers() {
    return this.notImplemented("listPlayers");
  }

  async listTournaments() {
    return this.notImplemented("listTournaments");
  }

  async getTournament(_id: string) {
    return this.notImplemented("getTournament");
  }

  async listTournamentEvents(_tournamentId: string) {
    return this.notImplemented("listTournamentEvents");
  }

  async listTournamentMatches(_tournamentId: string) {
    return this.notImplemented("listTournamentMatches");
  }

  async createMatch(_tournamentId: string, _input: CreateMatchInput) {
    return this.notImplemented("createMatch");
  }

  async getRankingSnapshot(_snapshotId: string) {
    return this.notImplemented("getRankingSnapshot");
  }

  async buildRankingEngineInput(_options: BuildRankingEngineInputOptions) {
    return this.notImplemented("buildRankingEngineInput");
  }

  async createRankingSnapshot(
    _input: CreateRankingSnapshotInput,
    _output: RankingEngineOutput
  ) {
    return this.notImplemented("createRankingSnapshot");
  }

  async getPublicRankingPage(_pageId: string) {
    return this.notImplemented("getPublicRankingPage");
  }

  private notImplemented(methodName: string): never {
    throw new Error(`SupabaseRepository.${methodName} is not implemented in stage 7.`);
  }
}
