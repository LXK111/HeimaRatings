import type {
  MatchSummary,
  PlayerSummary,
  PublicRankingPagePayload,
  RankingEngineMatchInput,
  RankingEngineOutput,
  RankingRow,
  TournamentEventSummary,
  TournamentSummary,
  WeaponType
} from "@/lib/domain/types";
import type {
  MatchRow,
  OrganizationRow,
  OrganizationMemberRow,
  PlayerRow,
  PlayerWeaponRatingRow,
  PublicPageRow,
  PublicPageSnapshotRow,
  RankingSnapshotItemRow,
  RankingSnapshotRow,
  TournamentEventRow,
  TournamentRow,
  WeaponTypeRow
} from "@/lib/database/types";
import { createServerSupabaseClient } from "@/lib/server/supabase/client";
import { normalizeRepositoryContext } from "@/lib/server/repositories/context";
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
import type { RepositoryContext } from "@/lib/server/repositories/context";

const demoTournamentId = "30000000-0000-0000-0000-000000000001";
const defaultOrganizationSlug = "hema-ratings-demo";
type SupabaseClientProvider = () =>
  | ReturnType<typeof createServerSupabaseClient>
  | Promise<ReturnType<typeof createServerSupabaseClient>>;

const idAliases: Record<string, string> = {
  demo: demoTournamentId,
  "tournament-001": demoTournamentId,
  "weapon-longsword": "10000000-0000-0000-0000-000000000001",
  "weapon-sabre": "10000000-0000-0000-0000-000000000002",
  "weapon-rapier": "10000000-0000-0000-0000-000000000003",
  "weapon-dagger": "10000000-0000-0000-0000-000000000004",
  "event-longsword-open": "40000000-0000-0000-0000-000000000001",
  "event-sabre-open": "40000000-0000-0000-0000-000000000002"
};

const reverseAliases = Object.fromEntries(
  Object.entries(idAliases)
    .filter(([alias]) => alias !== "demo")
    .map(([alias, id]) => [id, alias])
);

export class SupabaseRepository implements AppRepository {
  private readonly context: RepositoryContext;
  private readonly clientProvider: SupabaseClientProvider;
  private clientPromise: Promise<ReturnType<typeof createServerSupabaseClient>> | undefined;
  private organizationIdPromise: Promise<string> | undefined;

  constructor(
    context: RepositoryContext = {},
    clientProvider: SupabaseClientProvider = createServerSupabaseClient
  ) {
    this.context = normalizeRepositoryContext(context);
    this.clientProvider = clientProvider;
  }

  async listOrganizations() {
    const organizations = await this.query<OrganizationRow[]>(
      (await this.getClient()).from("organizations").select("*").order("name", { ascending: true }),
      "listOrganizations"
    );

    return organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at
    }));
  }

  async listUserOrganizationMemberships(userId: string) {
    const memberships = await this.query<OrganizationMemberRow[]>(
      (await this.getClient())
        .from("organization_members")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      "listUserOrganizationMemberships.memberships"
    );
    const organizationIds = memberships.map((membership) => membership.organization_id);
    const organizations = await this.query<OrganizationRow[]>(
      organizationIds.length > 0
        ? (await this.getClient()).from("organizations").select("*").in("id", organizationIds)
        : emptyResult<OrganizationRow[]>(),
      "listUserOrganizationMemberships.organizations"
    );
    const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));

    return memberships.flatMap((membership) => {
      const organization = organizationsById.get(membership.organization_id);
      if (!organization) {
        return [];
      }

      return [
        {
          organizationId: organization.id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          role: membership.role
        }
      ];
    });
  }

  async listWeapons() {
    const organizationId = await this.getOrganizationId();
    const data = await this.query<WeaponTypeRow[]>(
      (await this.getClient())
        .from("weapon_types")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true }),
      "listWeapons"
    );

    return data.map(toWeaponType);
  }

  async createWeapon(input: CreateWeaponInput) {
    const normalized = normalizeWeaponInput(input);
    const organizationId = await this.getOrganizationId();
    const inserted = await this.querySingle<WeaponTypeRow>(
      (await this.getClient())
        .from("weapon_types")
        .insert({
          organization_id: organizationId,
          name: normalized.name,
          slug: normalized.slug,
          enabled: normalized.enabled,
          sort_order: normalized.sortOrder
        })
        .select("*")
        .single(),
      "createWeapon"
    );
    if (!inserted) {
      throw new Error("createWeapon failed: inserted weapon was empty");
    }

    return toWeaponType(inserted);
  }

  async updateWeapon(input: UpdateWeaponInput) {
    const organizationId = await this.getOrganizationId();
    const updates = normalizeWeaponUpdate(input);
    const updated = await this.querySingle<WeaponTypeRow>(
      (await this.getClient())
        .from("weapon_types")
        .update(updates)
        .eq("id", resolveId(input.id))
        .eq("organization_id", organizationId)
        .select("*")
        .single(),
      "updateWeapon"
    );
    if (!updated) {
      throw new Error("Weapon type not found");
    }

    return toWeaponType(updated);
  }

  async listPlayers() {
    const organizationId = await this.getOrganizationId();
    const players = await this.query<PlayerRow[]>(
      (await this.getClient())
        .from("players")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      "listPlayers.players"
    );
    const playerIds = players.map((player) => player.id);
    const ratings = await this.query<PlayerWeaponRatingRow[]>(
      playerIds.length > 0
        ? (await this.getClient()).from("player_weapon_ratings").select("*").in("player_id", playerIds)
        : emptyResult<PlayerWeaponRatingRow[]>(),
      "listPlayers.ratings"
    );
    const ranksByWeapon = buildRanksByWeapon(ratings);

    return players.map((player) => ({
      id: player.id,
      name: player.name,
      club: player.club ?? "未知俱乐部",
      weaponRatings: ratings
        .filter((rating) => rating.player_id === player.id)
        .map((rating) => ({
          weaponTypeId: toPublicId(rating.weapon_type_id),
          rating: Number(rating.current_rating),
          rank: ranksByWeapon[rating.weapon_type_id]?.[rating.player_id] ?? 0
        }))
    }));
  }

  async createPlayer(input: CreatePlayerInput) {
    const organizationId = await this.getOrganizationId();
    const normalized = normalizePlayerInput(input);
    const inserted = await this.querySingle<PlayerRow>(
      (await this.getClient())
        .from("players")
        .insert({
          organization_id: organizationId,
          name: normalized.name,
          club: normalized.club
        })
        .select("*")
        .single(),
      "createPlayer.player"
    );
    if (!inserted) {
      throw new Error("createPlayer failed: inserted player was empty");
    }

    const enabledWeapons = await this.query<WeaponTypeRow[]>(
      (await this.getClient())
        .from("weapon_types")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("enabled", true)
        .order("sort_order", { ascending: true }),
      "createPlayer.weapons"
    );

    if (enabledWeapons.length > 0) {
      const initialRating = normalized.initialRating;
      await this.query<PlayerWeaponRatingRow[]>(
        (await this.getClient())
          .from("player_weapon_ratings")
          .insert(
            enabledWeapons.map((weapon) => ({
              player_id: inserted.id,
              weapon_type_id: weapon.id,
              initial_rating: initialRating,
              current_rating: initialRating
            }))
          )
          .select("*"),
        "createPlayer.ratings"
      );
    }

    return this.getPlayerSummary(inserted.id);
  }

  async updatePlayer(input: UpdatePlayerInput) {
    const organizationId = await this.getOrganizationId();
    const updates = normalizePlayerUpdate(input);
    const updated = await this.querySingle<PlayerRow>(
      (await this.getClient())
        .from("players")
        .update(updates)
        .eq("id", input.id)
        .eq("organization_id", organizationId)
        .select("*")
        .single(),
      "updatePlayer"
    );
    if (!updated) {
      throw new Error("Player not found");
    }

    return this.getPlayerSummary(updated.id);
  }

  async listTournaments() {
    const organizationId = await this.getOrganizationId();
    const tournaments = await this.query<TournamentRow[]>(
      (await this.getClient())
        .from("tournaments")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      "listTournaments.tournaments"
    );
    const tournamentIds = tournaments.map((tournament) => tournament.id);
    const events = await this.query<TournamentEventRow[]>(
      tournamentIds.length > 0
        ? (await this.getClient())
            .from("tournament_events")
            .select("id,tournament_id,weapon_type_id,name,format,status,created_at,updated_at")
            .in("tournament_id", tournamentIds)
        : emptyResult<TournamentEventRow[]>(),
      "listTournaments.events"
    );
    const matches = await this.query<Pick<MatchRow, "id" | "tournament_id">[]>(
      tournamentIds.length > 0
        ? (await this.getClient()).from("matches").select("id,tournament_id").in("tournament_id", tournamentIds)
        : emptyResult<Pick<MatchRow, "id" | "tournament_id">[]>(),
      "listTournaments.matches"
    );

    return tournaments.map((tournament) => ({
      id: toPublicId(tournament.id),
      name: tournament.name,
      status: tournament.status,
      eventCount: events.filter((event) => event.tournament_id === tournament.id).length,
      matchCount: matches.filter((match) => match.tournament_id === tournament.id).length,
      defaultAlgorithm: tournament.default_algorithm
    }));
  }

  async getTournament(id: string) {
    const resolvedId = resolveId(id);
    const tournaments = await this.listTournaments();
    return tournaments.find((tournament) => resolveId(tournament.id) === resolvedId);
  }

  async listTournamentEvents(tournamentId: string) {
    const resolvedTournamentId = resolveId(tournamentId);
    await this.ensureTournamentInOrganization(resolvedTournamentId, "listTournamentEvents.tournament");
    const data = await this.query<TournamentEventRow[]>(
      (await this.getClient())
        .from("tournament_events")
        .select("*")
        .eq("tournament_id", resolvedTournamentId)
        .order("created_at", { ascending: true }),
      "listTournamentEvents"
    );
    const matches = await this.query<Pick<MatchRow, "id" | "event_id">[]>(
      (await this.getClient()).from("matches").select("id,event_id").eq("tournament_id", resolvedTournamentId),
      "listTournamentEvents.matches"
    );

    return data.map((event) => ({
      id: toPublicId(event.id),
      tournamentId: toPublicId(event.tournament_id),
      weaponTypeId: toPublicId(event.weapon_type_id),
      name: event.name,
      format: event.format,
      status: event.status,
      matchCount: matches.filter((match) => match.event_id === event.id).length
    }));
  }

  async listTournamentMatches(tournamentId: string) {
    const resolvedTournamentId = resolveId(tournamentId);
    await this.ensureTournamentInOrganization(resolvedTournamentId, "listTournamentMatches.tournament");
    const matches = await this.query<MatchRow[]>(
      (await this.getClient())
        .from("matches")
        .select("*")
        .eq("tournament_id", resolvedTournamentId)
        .order("round", { ascending: true })
        .order("created_at", { ascending: true }),
      "listTournamentMatches.matches"
    );
    const players = await this.loadPlayersByIds(collectPlayerIds(matches));

    return matches.map((match) => toMatchSummary(match, players));
  }

  async createMatch(tournamentId: string, input: CreateMatchInput) {
    validateMatchInput(input);
    const resolvedTournamentId = resolveId(tournamentId);
    const organizationId = await this.getOrganizationId();
    const event = await this.querySingle<TournamentEventRow>(
      (await this.getClient())
        .from("tournament_events")
        .select("*")
        .eq("id", resolveId(input.eventId))
        .eq("tournament_id", resolvedTournamentId)
        .maybeSingle(),
      "createMatch.event"
    );
    if (!event) {
      throw new Error("Tournament event not found");
    }

    const tournament = await this.querySingle<TournamentRow>(
      (await this.getClient())
        .from("tournaments")
        .select("*")
        .eq("id", resolvedTournamentId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      "createMatch.tournament"
    );
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const matchPlayers = await this.findPlayersByNames(
      tournament.organization_id,
      input.player1Name,
      input.player2Name
    );
    const winnerId =
      input.score1 === input.score2
        ? null
        : input.score1 > input.score2
          ? matchPlayers.player1.id
          : matchPlayers.player2.id;

    const inserted = await this.querySingle<MatchRow>(
      (await this.getClient())
        .from("matches")
        .insert({
          tournament_id: resolvedTournamentId,
          event_id: event.id,
          weapon_type_id: event.weapon_type_id,
          round: input.round,
          player1_id: matchPlayers.player1.id,
          player2_id: matchPlayers.player2.id,
          score1: input.score1,
          score2: input.score2,
          winner_id: winnerId,
          played_at: new Date().toISOString()
        })
        .select("*")
        .single(),
      "createMatch.insert"
    );
    if (!inserted) {
      throw new Error("createMatch.insert failed: inserted match was empty");
    }

    return toMatchSummary(inserted, new Map([
      [matchPlayers.player1.id, matchPlayers.player1],
      [matchPlayers.player2.id, matchPlayers.player2]
    ]));
  }

  async getRankingSnapshot(snapshotId: string) {
    const snapshot = await this.querySingle<RankingSnapshotRow>(
      (await this.getClient())
        .from("ranking_snapshots")
        .select("*")
        .eq("id", resolveId(snapshotId))
        .maybeSingle(),
      "getRankingSnapshot.snapshot"
    );
    if (!snapshot) {
      throw new Error("Ranking snapshot not found");
    }
    await this.ensureTournamentInOrganization(snapshot.tournament_id, "getRankingSnapshot.tournament");

    const items = await this.query<RankingSnapshotItemRow[]>(
      (await this.getClient())
        .from("ranking_snapshot_items")
        .select("*")
        .eq("snapshot_id", snapshot.id)
        .order("rank", { ascending: true }),
      "getRankingSnapshot.items"
    );
    const players = await this.loadPlayersByIds(items.map((item) => item.player_id));

    return {
      id: toPublicId(snapshot.id),
      weaponTypeId: toPublicId(snapshot.weapon_type_id),
      algorithm: snapshot.algorithm,
      generatedAt: snapshot.generated_at,
      leaderName: players.get(items[0]?.player_id ?? "")?.name ?? "暂无排名",
      leaderRating: Number(items[0]?.rating ?? 0),
      items: items.map((item) => {
        const player = players.get(item.player_id);
        return {
          playerId: item.player_id,
          name: player?.name ?? "未知选手",
          club: player?.club ?? "未知俱乐部",
          rank: item.rank,
          rating: Number(item.rating),
          matches: item.matches_count,
          wins: item.wins_count,
          losses: item.losses_count
        };
      })
    };
  }

  async buildRankingEngineInput(options: BuildRankingEngineInputOptions) {
    const algorithm = options.algorithm ?? "hybrid";
    const tournamentId = resolveId(options.tournamentId ?? demoTournamentId);
    const weaponTypeId = resolveId(options.weaponTypeId ?? "weapon-longsword");
    const eventId = options.eventId ? resolveId(options.eventId) : undefined;
    await this.ensureTournamentInOrganization(tournamentId, "buildRankingEngineInput.tournament");
    await this.ensureWeaponInOrganization(weaponTypeId, "buildRankingEngineInput.weapon");
    if (eventId) {
      await this.ensureEventInTournament(eventId, tournamentId, weaponTypeId, "buildRankingEngineInput.event");
    }
    const ratings = await this.query<PlayerWeaponRatingRow[]>(
      (await this.getClient()).from("player_weapon_ratings").select("*").eq("weapon_type_id", weaponTypeId),
      "buildRankingEngineInput.ratings"
    );
    const players = await this.loadPlayersByIds(ratings.map((rating) => rating.player_id));
    const scopedRatings = ratings.filter((rating) => players.has(rating.player_id));
    let matchesQuery = (await this.getClient())
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("weapon_type_id", weaponTypeId);
    if (eventId) {
      matchesQuery = matchesQuery.eq("event_id", eventId);
    }
    const matches = await this.query<MatchRow[]>(
      matchesQuery
        .order("round", { ascending: true })
        .order("created_at", { ascending: true }),
      "buildRankingEngineInput.matches"
    );
    const groupedMatches = groupMatchesByRound(matches, players);

    return {
      tournamentId: toPublicId(tournamentId),
      weaponTypeId: toPublicId(weaponTypeId),
      eventId: eventId ? toPublicId(eventId) : undefined,
      algorithm,
      players: scopedRatings.map((rating) => {
        const player = players.get(rating.player_id);
        return {
          id: rating.player_id,
          name: player?.name ?? rating.player_id,
          rating: Number(rating.current_rating),
          rd: Number(rating.rd),
          sigma: Number(rating.sigma)
        };
      }),
      matches: groupedMatches
    };
  }

  async createRankingSnapshot(
    input: CreateRankingSnapshotInput,
    output: RankingEngineOutput
  ): Promise<RankingSnapshotPayload> {
    const tournamentId = resolveId(input.tournamentId);
    const weaponTypeId = resolveId(input.weaponTypeId);
    const eventId = input.eventId ? resolveId(input.eventId) : null;
    const organizationId = await this.getOrganizationId();
    await this.ensureWeaponInOrganization(weaponTypeId, "createRankingSnapshot.weapon");
    if (eventId) {
      await this.ensureEventInTournament(eventId, tournamentId, weaponTypeId, "createRankingSnapshot.event");
    }
    const tournament = await this.querySingle<TournamentRow>(
      (await this.getClient())
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      "createRankingSnapshot.tournament"
    );
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const snapshot = await this.querySingle<RankingSnapshotRow>(
      (await this.getClient())
        .from("ranking_snapshots")
        .insert({
          tournament_id: tournamentId,
          weapon_type_id: weaponTypeId,
          event_id: eventId,
          algorithm: input.algorithm,
          generated_at: output.generatedAt,
          source_hash: input.sourceHash ?? null
        })
        .select("*")
        .single(),
      "createRankingSnapshot.snapshot"
    );
    if (!snapshot) {
      throw new Error("createRankingSnapshot.snapshot failed: inserted snapshot was empty");
    }

    const items = output.rankings.map((ranking) => ({
      snapshot_id: snapshot.id,
      player_id: resolveId(ranking.playerId),
      rank: ranking.rank,
      rating: ranking.rating,
      rd: ranking.rd ?? null,
      sigma: ranking.sigma ?? null,
      matches_count: ranking.matches,
      wins_count: ranking.wins,
      losses_count: ranking.losses,
      draws_count: ranking.draws
    }));

    if (items.length > 0) {
      await this.query<RankingSnapshotItemRow[]>(
        (await this.getClient()).from("ranking_snapshot_items").insert(items).select("*"),
        "createRankingSnapshot.items"
      );
    }

    if (input.publishPageId) {
      const page = await this.findOrCreatePublicPage(
        input.publishPageId,
        tournament,
        tournamentId,
        weaponTypeId
      );
      try {
        await this.publishSnapshotToPage(page.id, weaponTypeId, snapshot.id);
      } catch (error) {
        if (!isMissingPublicPageSnapshotsTable(error)) {
          throw error;
        }
        await this.publishSnapshotToLegacyPage(page.id, weaponTypeId, snapshot.id);
      }
    }

    return this.getRankingSnapshot(snapshot.id);
  }

  async getPublicRankingPage(pageId: string) {
    const organizationId = await this.getOrganizationId();
    const page = await this.querySingle<PublicPageRow>(
      (await this.getClient())
        .from("public_pages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("page_id", pageId)
        .maybeSingle(),
      "getPublicRankingPage.page"
    );
    if (!page || !page.enabled) {
      return undefined;
    }

    const weapons = (await this.listWeapons()).filter((weapon) => weapon.enabled);
    const pageSnapshots = await this.listPublicPageSnapshots(page.id);
    const snapshots = await Promise.all(
      pageSnapshots.map((pageSnapshot) => this.getRankingSnapshot(pageSnapshot.snapshot_id))
    );
    if (snapshots.length === 0 && page.snapshot_id) {
      snapshots.push(await this.getRankingSnapshot(page.snapshot_id));
    }
    const primarySnapshot =
      snapshots.find((snapshot) => snapshot.weaponTypeId === toPublicId(page.default_weapon_type_id ?? "")) ??
      snapshots[0];
    const rankingsByWeapon: Record<string, RankingRow[]> = {};
    for (const snapshot of snapshots) {
      rankingsByWeapon[snapshot.weaponTypeId] = snapshot.items;
    }

    const publicUrl = `/public/rankings/${page.page_id}`;
    const embedUrl = `/embed/rankings/${page.page_id}`;

    return {
      pageId: page.page_id,
      title: page.title,
      enabled: page.enabled,
      theme: page.theme,
      defaultWeaponTypeId: toPublicId(page.default_weapon_type_id ?? weapons[0]?.id ?? ""),
      weapons,
      rankingsByWeapon,
      algorithm: primarySnapshot?.algorithm ?? "hybrid",
      generatedAt: primarySnapshot?.generatedAt,
      publicUrl,
      embedUrl,
      iframeCode: `<iframe src="${embedUrl}" title="HEMA Rankings" width="100%" height="640" style="border:0;border-radius:24px;"></iframe>`
    } satisfies PublicRankingPagePayload;
  }

  private async getPlayerSummary(playerId: string) {
    const player = (await this.listPlayers()).find((item) => item.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    return player;
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = Promise.resolve(this.clientProvider());
    }

    return this.clientPromise;
  }

  private async loadPlayersByIds(playerIds: string[]) {
    const uniqueIds = Array.from(new Set(playerIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
      return new Map<string, PlayerRow>();
    }

    const organizationId = await this.getOrganizationId();
    const players = await this.query<PlayerRow[]>(
      (await this.getClient())
        .from("players")
        .select("*")
        .eq("organization_id", organizationId)
        .in("id", uniqueIds),
      "loadPlayersByIds"
    );

    return new Map(players.map((player) => [player.id, player]));
  }

  private async getOrganizationId() {
    if (!this.organizationIdPromise) {
      this.organizationIdPromise = this.resolveOrganizationId();
    }

    return this.organizationIdPromise;
  }

  private async resolveOrganizationId() {
    if (this.context.organizationId) {
      const organization = await this.querySingle<OrganizationRow>(
        (await this.getClient())
          .from("organizations")
          .select("*")
          .eq("id", this.context.organizationId)
          .maybeSingle(),
        "resolveOrganizationId.byId"
      );

      if (!organization) {
        throw new Error(`Organization not found for request organization id=${this.context.organizationId}`);
      }

      return organization.id;
    }

    const slug =
      this.context.organizationSlug ??
      process.env.HEIMA_RATINGS_ORGANIZATION_SLUG ??
      defaultOrganizationSlug;
    const organization = await this.querySingle<OrganizationRow>(
      (await this.getClient()).from("organizations").select("*").eq("slug", slug).maybeSingle(),
      "resolveOrganizationId"
    );

    if (!organization) {
      throw new Error(`Organization not found for HEIMA_RATINGS_ORGANIZATION_SLUG=${slug}`);
    }

    return organization.id;
  }

  private async ensureTournamentInOrganization(tournamentId: string, operation: string) {
    const organizationId = await this.getOrganizationId();
    const tournament = await this.querySingle<Pick<TournamentRow, "id">>(
      (await this.getClient())
        .from("tournaments")
        .select("id")
        .eq("id", tournamentId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      operation
    );

    if (!tournament) {
      throw new Error("Tournament not found in current organization");
    }
  }

  private async ensureWeaponInOrganization(weaponTypeId: string, operation: string) {
    const organizationId = await this.getOrganizationId();
    const weapon = await this.querySingle<Pick<WeaponTypeRow, "id">>(
      (await this.getClient())
        .from("weapon_types")
        .select("id")
        .eq("id", weaponTypeId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      operation
    );

    if (!weapon) {
      throw new Error("Weapon type not found in current organization");
    }
  }

  private async ensureEventInTournament(
    eventId: string,
    tournamentId: string,
    weaponTypeId: string,
    operation: string
  ) {
    const event = await this.querySingle<Pick<TournamentEventRow, "id">>(
      (await this.getClient())
        .from("tournament_events")
        .select("id")
        .eq("id", eventId)
        .eq("tournament_id", tournamentId)
        .eq("weapon_type_id", weaponTypeId)
        .maybeSingle(),
      operation
    );

    if (!event) {
      throw new Error("Tournament event not found for current tournament and weapon");
    }
  }

  private async findPlayersByNames(organizationId: string, player1Name: string, player2Name: string) {
    const players = await this.query<PlayerRow[]>(
      (await this.getClient())
        .from("players")
        .select("*")
        .eq("organization_id", organizationId)
        .in("name", [player1Name, player2Name]),
      "findPlayersByNames"
    );
    const player1 = players.find((player) => player.name === player1Name);
    const player2 = players.find((player) => player.name === player2Name);

    if (!player1 || !player2) {
      throw new Error("Both players must exist before creating a match");
    }

    if (player1.id === player2.id) {
      throw new Error("player1Name and player2Name must be different");
    }

    return { player1, player2 };
  }

  private async listPublicPageSnapshots(publicPageId: string) {
    try {
      return await this.query<PublicPageSnapshotRow[]>(
        (await this.getClient())
          .from("public_page_snapshots")
          .select("*")
          .eq("public_page_id", publicPageId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        "listPublicPageSnapshots"
      );
    } catch (error) {
      if (isMissingPublicPageSnapshotsTable(error)) {
        return [];
      }

      throw error;
    }
  }

  private async findOrCreatePublicPage(
    pageId: string,
    tournament: TournamentRow,
    tournamentId: string,
    weaponTypeId: string
  ) {
    const organizationId = await this.getOrganizationId();
    const existingPage = await this.querySingle<PublicPageRow>(
      (await this.getClient())
        .from("public_pages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("page_id", pageId)
        .maybeSingle(),
      "findOrCreatePublicPage.find"
    );

    if (existingPage) {
      const updated = await this.querySingle<PublicPageRow>(
        (await this.getClient())
          .from("public_pages")
          .update({
            tournament_id: tournamentId,
            snapshot_id: null,
            default_weapon_type_id: existingPage.default_weapon_type_id ?? weaponTypeId,
            enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingPage.id)
          .select("*")
          .single(),
        "findOrCreatePublicPage.update"
      );
      if (!updated) {
        throw new Error("findOrCreatePublicPage.update failed: updated page was empty");
      }
      return updated;
    }

    const inserted = await this.querySingle<PublicPageRow>(
      (await this.getClient())
        .from("public_pages")
        .insert({
          organization_id: organizationId,
          page_id: pageId,
          tournament_id: tournamentId,
          snapshot_id: null,
          default_weapon_type_id: weaponTypeId,
          title: `${tournament.name} 公开榜单`,
          theme: "dark",
          enabled: true
        })
        .select("*")
        .single(),
      "findOrCreatePublicPage.insert"
    );
    if (!inserted) {
      throw new Error("findOrCreatePublicPage.insert failed: inserted page was empty");
    }

    return inserted;
  }

  private async publishSnapshotToPage(
    publicPageId: string,
    weaponTypeId: string,
    snapshotId: string
  ) {
    const organizationId = await this.getOrganizationId();
    const weapon = await this.querySingle<WeaponTypeRow>(
      (await this.getClient())
        .from("weapon_types")
        .select("*")
        .eq("id", weaponTypeId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      "publishSnapshotToPage.weapon"
    );
    if (!weapon) {
      throw new Error("Weapon type not found in current organization");
    }

    await this.query<PublicPageSnapshotRow[]>(
      (await this.getClient())
        .from("public_page_snapshots")
        .upsert(
          {
            public_page_id: publicPageId,
            weapon_type_id: weaponTypeId,
            snapshot_id: snapshotId,
            sort_order: weapon.sort_order,
            updated_at: new Date().toISOString()
          },
          { onConflict: "public_page_id,weapon_type_id" }
        )
        .select("*"),
      "publishSnapshotToPage.upsert"
    );
  }

  private async publishSnapshotToLegacyPage(
    publicPageId: string,
    weaponTypeId: string,
    snapshotId: string
  ) {
    await this.query<PublicPageRow[]>(
      (await this.getClient())
        .from("public_pages")
        .update({
          snapshot_id: snapshotId,
          default_weapon_type_id: weaponTypeId,
          updated_at: new Date().toISOString()
        })
        .eq("id", publicPageId)
        .select("*"),
      "publishSnapshotToLegacyPage.update"
    );
  }

  private async query<T>(
    builder: PromiseLike<{ data: T | null; error: { message: string } | null }>,
    operation: string
  ): Promise<T> {
    const { data, error } = await builder;
    if (error) {
      throw new Error(`${operation} failed: ${error.message}`);
    }

    return data as T;
  }

  private async querySingle<T>(
    builder: PromiseLike<{ data: T | null; error: { message: string } | null }>,
    operation: string
  ): Promise<T | null> {
    const { data, error } = await builder;
    if (error) {
      throw new Error(`${operation} failed: ${error.message}`);
    }

    return data;
  }
}

function toWeaponType(row: WeaponTypeRow): WeaponType {
  return {
    id: toPublicId(row.id),
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    enabled: row.enabled,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toMatchSummary(match: MatchRow, players: Map<string, PlayerRow>): MatchSummary {
  const player1 = players.get(match.player1_id);
  const player2 = players.get(match.player2_id);
  const winner = match.winner_id ? players.get(match.winner_id) : undefined;

  return {
    id: match.id,
    tournamentId: toPublicId(match.tournament_id),
    eventId: toPublicId(match.event_id),
    weaponTypeId: toPublicId(match.weapon_type_id),
    round: match.round,
    player1Name: player1?.name ?? match.player1_id,
    player2Name: player2?.name ?? match.player2_id,
    score1: match.score1,
    score2: match.score2,
    winnerName: winner?.name ?? "平局"
  };
}

function validateMatchInput(input: CreateMatchInput) {
  if (!input.eventId) {
    throw new Error("eventId is required");
  }
  if (!input.player1Name || !input.player2Name) {
    throw new Error("player1Name and player2Name are required");
  }
  if (input.player1Name === input.player2Name) {
    throw new Error("player1Name and player2Name must be different");
  }
  if (!Number.isFinite(input.round) || input.round < 1) {
    throw new Error("round must be a positive number");
  }
  if (!Number.isFinite(input.score1) || !Number.isFinite(input.score2)) {
    throw new Error("score1 and score2 must be numbers");
  }
  if (input.score1 < 0 || input.score2 < 0) {
    throw new Error("score1 and score2 must be non-negative");
  }
}

function normalizeWeaponInput(input: CreateWeaponInput) {
  const name = normalizeRequiredText(input.name, "name");
  const slug = normalizeWeaponSlug(input.slug);
  return {
    name,
    slug,
    enabled: input.enabled,
    sortOrder: normalizeSortOrder(input.sortOrder)
  };
}

function normalizeWeaponUpdate(input: UpdateWeaponInput) {
  const updates: Partial<Pick<WeaponTypeRow, "name" | "slug" | "enabled" | "sort_order">> = {};

  if (input.name !== undefined) {
    updates.name = normalizeRequiredText(input.name, "name");
  }
  if (input.slug !== undefined) {
    updates.slug = normalizeWeaponSlug(input.slug);
  }
  if (input.enabled !== undefined) {
    updates.enabled = input.enabled;
  }
  if (input.sortOrder !== undefined) {
    updates.sort_order = normalizeSortOrder(input.sortOrder);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one weapon field is required");
  }

  return updates;
}

function normalizePlayerInput(input: CreatePlayerInput) {
  return {
    name: normalizeRequiredText(input.name, "name"),
    club: normalizeOptionalText(input.club),
    initialRating: normalizeInitialRating(input.initialRating)
  };
}

function normalizePlayerUpdate(input: UpdatePlayerInput) {
  const updates: Partial<Pick<PlayerRow, "name" | "club">> = {};

  if (input.name !== undefined) {
    updates.name = normalizeRequiredText(input.name, "name");
  }
  if (input.club !== undefined) {
    updates.club = normalizeOptionalText(input.club);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one player field is required");
  }

  return updates;
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeInitialRating(value: number | undefined) {
  const rating = value ?? 1500;
  if (!Number.isFinite(rating) || rating < 0) {
    throw new Error("initialRating must be a non-negative number");
  }

  return rating;
}

function normalizeWeaponSlug(value: string) {
  const slug = normalizeRequiredText(value, "slug").toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("slug must contain lowercase letters, numbers, and hyphens only");
  }

  return slug;
}

function normalizeSortOrder(value: number | undefined) {
  const sortOrder = value ?? 999;
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("sortOrder must be a non-negative integer");
  }

  return sortOrder;
}

function buildRanksByWeapon(ratings: PlayerWeaponRatingRow[]) {
  return ratings.reduce<Record<string, Record<string, number>>>((acc, rating) => {
    if (!acc[rating.weapon_type_id]) {
      const weaponRatings = ratings
        .filter((item) => item.weapon_type_id === rating.weapon_type_id)
        .sort((a, b) => Number(b.current_rating) - Number(a.current_rating));
      acc[rating.weapon_type_id] = Object.fromEntries(
        weaponRatings.map((item, index) => [item.player_id, index + 1])
      );
    }
    return acc;
  }, {});
}

function groupMatchesByRound(matches: MatchRow[], players: Map<string, PlayerRow>) {
  const grouped = matches.reduce<Record<number, RankingEngineMatchInput[]>>((acc, match) => {
    const player1 = players.get(match.player1_id);
    const player2 = players.get(match.player2_id);
    acc[match.round] = [
      ...(acc[match.round] ?? []),
      {
        id: match.id,
        round: match.round,
        player1: player1?.name ?? match.player1_id,
        player2: player2?.name ?? match.player2_id,
        score1: match.score1,
        score2: match.score2
      }
    ];
    return acc;
  }, {});

  return Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .map((round) => grouped[round]);
}

function collectPlayerIds(matches: MatchRow[]) {
  return matches.flatMap((match) => [
    match.player1_id,
    match.player2_id,
    ...(match.winner_id ? [match.winner_id] : [])
  ]);
}

function isMissingPublicPageSnapshotsTable(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("public_page_snapshots") &&
    (error.message.includes("does not exist") || error.message.includes("schema cache"))
  );
}

function resolveId(id: string) {
  return idAliases[id] ?? id;
}

function toPublicId(id: string) {
  return reverseAliases[id] ?? id;
}

function emptyResult<T>() {
  return Promise.resolve({ data: [] as T, error: null });
}
