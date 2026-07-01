import type {
  BracketSlotSummary,
  MatchSummary,
  PlayerSummary,
  PublicRankingPagePayload,
  PublicRankingPageSummary,
  RankingEngineMatchInput,
  RankingEngineOutput,
  RankingRow,
  TournamentEventSummary,
  TournamentSummary,
  WeaponType
} from "@/lib/domain/types";
import type {
  BracketSlotRow,
  MatchRow,
  OrganizationRow,
  OrganizationMemberRow,
  PlayerRow,
  PlayerWeaponRatingRow,
  PublicPageRow,
  PublicPageSnapshotRow,
  RankingSnapshotItemRow,
  RankingSnapshotRow,
  TournamentEventEntryRow,
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
import type { RepositoryContext } from "@/lib/server/repositories/context";

const demoTournamentId = "30000000-0000-0000-0000-000000000001";
const defaultOrganizationSlug = "hema-ratings-demo";
type SupabaseClientProvider = () =>
  | ReturnType<typeof createServerSupabaseClient>
  | Promise<ReturnType<typeof createServerSupabaseClient>>;
type BracketAdvancementEntrant = {
  playerId: string;
  sourceMatchId?: string;
};

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
      format: tournament.format,
      status: tournament.status,
      eventCount: events.filter((event) => event.tournament_id === tournament.id).length,
      matchCount: matches.filter((match) => match.tournament_id === tournament.id).length,
      defaultAlgorithm: tournament.default_algorithm,
      startedAt: tournament.started_at ?? undefined,
      endedAt: tournament.ended_at ?? undefined
    }));
  }

  async createTournament(input: CreateTournamentInput) {
    const organizationId = await this.getOrganizationId();
    const normalized = normalizeTournamentInput(input);
    const inserted = await this.querySingle<TournamentRow>(
      (await this.getClient())
        .from("tournaments")
        .insert({
          organization_id: organizationId,
          name: normalized.name,
          format: normalized.format,
          status: normalized.status,
          default_algorithm: normalized.defaultAlgorithm,
          started_at: normalized.startedAt,
          ended_at: normalized.endedAt
        })
        .select("*")
        .single(),
      "createTournament"
    );
    if (!inserted) {
      throw new Error("createTournament failed: inserted tournament was empty");
    }

    return this.getTournamentSummary(inserted.id);
  }

  async updateTournament(input: UpdateTournamentInput) {
    const organizationId = await this.getOrganizationId();
    const updates = normalizeTournamentUpdate(input);
    const updated = await this.querySingle<TournamentRow>(
      (await this.getClient())
        .from("tournaments")
        .update(updates)
        .eq("id", resolveId(input.id))
        .eq("organization_id", organizationId)
        .select("*")
        .single(),
      "updateTournament"
    );
    if (!updated) {
      throw new Error("Tournament not found");
    }

    return this.getTournamentSummary(updated.id);
  }

  async deleteTournament(id: string) {
    const organizationId = await this.getOrganizationId();
    const deleted = await this.query<TournamentRow[]>(
      (await this.getClient())
        .from("tournaments")
        .delete()
        .eq("id", resolveId(id))
        .eq("organization_id", organizationId)
        .select("*"),
      "deleteTournament"
    );
    if (deleted.length === 0) {
      throw new Error("Tournament not found");
    }
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

  async createTournamentEvent(tournamentId: string, input: CreateTournamentEventInput) {
    const resolvedTournamentId = resolveId(tournamentId);
    await this.ensureTournamentInOrganization(resolvedTournamentId, "createTournamentEvent.tournament");
    const normalized = normalizeTournamentEventInput(input);
    const weaponTypeId = resolveId(normalized.weaponTypeId);
    await this.ensureWeaponInOrganization(weaponTypeId, "createTournamentEvent.weapon");
    const inserted = await this.querySingle<TournamentEventRow>(
      (await this.getClient())
        .from("tournament_events")
        .insert({
          tournament_id: resolvedTournamentId,
          weapon_type_id: weaponTypeId,
          name: normalized.name,
          format: normalized.format,
          status: normalized.status
        })
        .select("*")
        .single(),
      "createTournamentEvent"
    );
    if (!inserted) {
      throw new Error("createTournamentEvent failed: inserted tournament event was empty");
    }

    return this.getTournamentEventSummary(resolvedTournamentId, inserted.id);
  }

  async updateTournamentEvent(tournamentId: string, input: UpdateTournamentEventInput) {
    const resolvedTournamentId = resolveId(tournamentId);
    await this.ensureTournamentInOrganization(resolvedTournamentId, "updateTournamentEvent.tournament");
    const updates = normalizeTournamentEventUpdate(input);
    if (updates.weapon_type_id) {
      await this.ensureWeaponInOrganization(updates.weapon_type_id, "updateTournamentEvent.weapon");
    }
    const updated = await this.querySingle<TournamentEventRow>(
      (await this.getClient())
        .from("tournament_events")
        .update(updates)
        .eq("id", resolveId(input.id))
        .eq("tournament_id", resolvedTournamentId)
        .select("*")
        .single(),
      "updateTournamentEvent"
    );
    if (!updated) {
      throw new Error("Tournament event not found");
    }

    return this.getTournamentEventSummary(resolvedTournamentId, updated.id);
  }

  async listTournamentEventEntries(tournamentId: string, eventId: string) {
    const resolvedTournamentId = resolveId(tournamentId);
    const resolvedEventId = resolveId(eventId);
    await this.ensureEventInCurrentTournament(resolvedTournamentId, resolvedEventId, "listTournamentEventEntries.event");
    const entries = await this.query<TournamentEventEntryRow[]>(
      (await this.getClient())
        .from("tournament_event_entries")
        .select("*")
        .eq("event_id", resolvedEventId)
        .order("seed", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      "listTournamentEventEntries.entries"
    );
    const players = await this.loadPlayersByIds(entries.map((entry) => entry.player_id));

    return entries.map((entry) => toTournamentEventEntrySummary(entry, players));
  }

  async createTournamentEventEntry(
    tournamentId: string,
    eventId: string,
    input: CreateTournamentEventEntryInput
  ) {
    const resolvedTournamentId = resolveId(tournamentId);
    const resolvedEventId = resolveId(eventId);
    const normalized = normalizeTournamentEventEntryInput(input);
    await this.ensureEventInCurrentTournament(resolvedTournamentId, resolvedEventId, "createTournamentEventEntry.event");
    const playerId = resolveId(normalized.playerId);
    await this.ensurePlayerInOrganization(playerId, "createTournamentEventEntry.player");
    const event = await this.getTournamentEventRow(resolvedTournamentId, resolvedEventId, "createTournamentEventEntry.eventWeapon");
    await this.ensurePlayerWeaponRating(playerId, event.weapon_type_id);
    const inserted = await this.querySingle<TournamentEventEntryRow>(
      (await this.getClient())
        .from("tournament_event_entries")
        .insert({
          event_id: resolvedEventId,
          player_id: playerId,
          seed: normalized.seed,
          status: "registered"
        })
        .select("*")
        .single(),
      "createTournamentEventEntry"
    );
    if (!inserted) {
      throw new Error("createTournamentEventEntry failed: inserted entry was empty");
    }

    return this.getTournamentEventEntrySummary(resolvedTournamentId, resolvedEventId, inserted.id);
  }

  async updateTournamentEventEntry(
    tournamentId: string,
    eventId: string,
    input: UpdateTournamentEventEntryInput
  ) {
    const resolvedTournamentId = resolveId(tournamentId);
    const resolvedEventId = resolveId(eventId);
    await this.ensureEventInCurrentTournament(resolvedTournamentId, resolvedEventId, "updateTournamentEventEntry.event");
    const updates = normalizeTournamentEventEntryUpdate(input);
    const updated = await this.querySingle<TournamentEventEntryRow>(
      (await this.getClient())
        .from("tournament_event_entries")
        .update(updates)
        .eq("id", resolveId(input.id))
        .eq("event_id", resolvedEventId)
        .select("*")
        .single(),
      "updateTournamentEventEntry"
    );
    if (!updated) {
      throw new Error("Tournament event entry not found");
    }

    return this.getTournamentEventEntrySummary(resolvedTournamentId, resolvedEventId, updated.id);
  }

  async listTournamentEventBracketSlots(tournamentId: string, eventId: string) {
    const resolvedTournamentId = resolveId(tournamentId);
    const resolvedEventId = resolveId(eventId);
    await this.ensureEventInCurrentTournament(
      resolvedTournamentId,
      resolvedEventId,
      "listTournamentEventBracketSlots.event"
    );
    const slots = await this.query<BracketSlotRow[]>(
      (await this.getClient())
        .from("bracket_slots")
        .select("*")
        .eq("event_id", resolvedEventId)
        .order("round", { ascending: true })
        .order("slot_index", { ascending: true }),
      "listTournamentEventBracketSlots.slots"
    );
    const players = await this.loadPlayersByIds(
      slots.map((slot) => slot.player_id).filter((id): id is string => Boolean(id))
    );
    const sourceMatches = await this.query<MatchRow[]>(
      slots.some((slot) => slot.source_match_id)
        ? (await this.getClient())
          .from("matches")
          .select("*")
          .in("id", slots.map((slot) => slot.source_match_id).filter((id): id is string => Boolean(id)))
        : emptyResult<MatchRow[]>(),
      "listTournamentEventBracketSlots.sourceMatches"
    );
    const sourceMatchesById = new Map(sourceMatches.map((match) => [match.id, match]));
    const sourcePlayers = await this.loadPlayersByIds(collectPlayerIds(sourceMatches));

    return slots.map((slot) =>
      toBracketSlotSummary(slot, players, sourceMatchesById, sourcePlayers)
    );
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
    await this.ensurePlayersRegisteredForEvent(event.id, [
      matchPlayers.player1.id,
      matchPlayers.player2.id
    ]);
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

  async updateMatchResult(tournamentId: string, input: UpdateMatchResultInput) {
    validateMatchResultInput(input);
    const resolvedTournamentId = resolveId(tournamentId);
    await this.ensureTournamentInOrganization(resolvedTournamentId, "updateMatchResult.tournament");
    const match = await this.querySingle<MatchRow>(
      (await this.getClient())
        .from("matches")
        .select("*")
        .eq("id", resolveId(input.id))
        .eq("tournament_id", resolvedTournamentId)
        .maybeSingle(),
      "updateMatchResult.match"
    );
    if (!match) {
      throw new Error("Match not found");
    }
    if (![match.player1_id, match.player2_id].includes(resolveId(input.winnerId))) {
      throw new Error("winnerId must be one of match players");
    }

    const updated = await this.querySingle<MatchRow>(
      (await this.getClient())
        .from("matches")
        .update({
          score1: input.score1,
          score2: input.score2,
          winner_id: resolveId(input.winnerId),
          played_at: new Date().toISOString()
        })
        .eq("id", match.id)
        .eq("tournament_id", resolvedTournamentId)
        .select("*")
        .single(),
      "updateMatchResult.update"
    );
    if (!updated) {
      throw new Error("updateMatchResult.update failed: updated match was empty");
    }
    const players = await this.loadPlayersByIds(collectPlayerIds([updated]));

    return toMatchSummary(updated, players);
  }

  async generateTournamentEventBracket(tournamentId: string, eventId: string) {
    const resolvedTournamentId = resolveId(tournamentId);
    const resolvedEventId = resolveId(eventId);
    await this.ensureEventInCurrentTournament(resolvedTournamentId, resolvedEventId, "generateBracket.event");
    const event = await this.querySingle<TournamentEventRow>(
      (await this.getClient())
        .from("tournament_events")
        .select("*")
        .eq("id", resolvedEventId)
        .eq("tournament_id", resolvedTournamentId)
        .maybeSingle(),
      "generateBracket.loadEvent"
    );
    if (!event) {
      throw new Error("Tournament event not found");
    }

    const existingMatches = await this.query<Pick<MatchRow, "id">[]>(
      (await this.getClient())
        .from("matches")
        .select("id")
        .eq("tournament_id", resolvedTournamentId)
        .eq("event_id", resolvedEventId)
        .limit(1),
      "generateBracket.existingMatches"
    );
    if (existingMatches.length > 0) {
      throw new Error("Tournament event already has matches");
    }
    const existingSlots = await this.query<Pick<BracketSlotRow, "id">[]>(
      (await this.getClient())
        .from("bracket_slots")
        .select("id")
        .eq("event_id", resolvedEventId)
        .limit(1),
      "generateBracket.existingSlots"
    );
    if (existingSlots.length > 0) {
      throw new Error("Tournament event already has bracket slots");
    }

    const entries = await this.query<TournamentEventEntryRow[]>(
      (await this.getClient())
        .from("tournament_event_entries")
        .select("*")
        .eq("event_id", resolvedEventId)
        .eq("status", "registered")
        .order("seed", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      "generateBracket.entries"
    );
    if (entries.length < 2) {
      throw new Error("At least two registered entries are required");
    }

    const pairs = event.format === "single_elimination"
      ? buildSingleEliminationEntryPairs(entries)
      : event.format === "round_robin"
        ? buildRoundRobinEntryPairs(entries)
        : undefined;
    if (!pairs) {
      throw new Error("Bracket generation is only available for single elimination and round robin events");
    }
    if (event.format === "single_elimination") {
      await this.query<BracketSlotRow[]>(
        (await this.getClient())
          .from("bracket_slots")
          .insert(buildInitialBracketSlotRows(resolvedEventId, entries, pairs))
          .select("*"),
        "generateBracket.insertSlots"
      );
    }

    const inserted = await this.query<MatchRow[]>(
      (await this.getClient())
        .from("matches")
        .insert(
          pairs.map(([player1, player2]) => ({
            tournament_id: resolvedTournamentId,
            event_id: resolvedEventId,
            weapon_type_id: event.weapon_type_id,
            round: 1,
            player1_id: player1.player_id,
            player2_id: player2.player_id,
            score1: 0,
            score2: 0,
            winner_id: null,
            played_at: null
          }))
        )
        .select("*"),
      "generateBracket.insertMatches"
    );
    const players = await this.loadPlayersByIds(collectPlayerIds(inserted));

    return inserted.map((match) => toMatchSummary(match, players));
  }

  async advanceTournamentEventBracket(tournamentId: string, eventId: string) {
    const resolvedTournamentId = resolveId(tournamentId);
    const resolvedEventId = resolveId(eventId);
    await this.ensureEventInCurrentTournament(resolvedTournamentId, resolvedEventId, "advanceBracket.event");
    const event = await this.querySingle<TournamentEventRow>(
      (await this.getClient())
        .from("tournament_events")
        .select("*")
        .eq("id", resolvedEventId)
        .eq("tournament_id", resolvedTournamentId)
        .maybeSingle(),
      "advanceBracket.loadEvent"
    );
    if (!event) {
      throw new Error("Tournament event not found");
    }
    if (event.format !== "single_elimination") {
      throw new Error("Bracket advancement is only available for single elimination events");
    }

    const eventMatches = await this.query<MatchRow[]>(
      (await this.getClient())
        .from("matches")
        .select("*")
        .eq("tournament_id", resolvedTournamentId)
        .eq("event_id", resolvedEventId)
        .order("round", { ascending: true })
        .order("created_at", { ascending: true }),
      "advanceBracket.matches"
    );
    if (eventMatches.length === 0) {
      throw new Error("Tournament event has no matches");
    }

    const currentRound = Math.max(...eventMatches.map((match) => match.round));
    const currentRoundMatches = eventMatches.filter((match) => match.round === currentRound);
    const nextRoundMatches = eventMatches.filter((match) => match.round === currentRound + 1);
    if (nextRoundMatches.length > 0) {
      throw new Error("Next round already exists");
    }
    const nextRoundSlots = await this.query<Pick<BracketSlotRow, "id">[]>(
      (await this.getClient())
        .from("bracket_slots")
        .select("id")
        .eq("event_id", resolvedEventId)
        .eq("round", currentRound + 1)
        .limit(1),
      "advanceBracket.nextRoundSlots"
    );
    if (nextRoundSlots.length > 0) {
      throw new Error("Next round bracket slots already exist");
    }
    if (currentRoundMatches.some((match) => !match.winner_id || match.score1 === match.score2)) {
      throw new Error("Current round must be completed before advancing");
    }
    const entries = currentRound === 1
      ? await this.query<TournamentEventEntryRow[]>(
        (await this.getClient())
          .from("tournament_event_entries")
          .select("*")
          .eq("event_id", resolvedEventId)
          .eq("status", "registered")
          .order("seed", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
        "advanceBracket.entries"
      )
      : [];
    const advancementEntrants = [
      ...currentRoundMatches
        .flatMap((match): BracketAdvancementEntrant[] =>
          match.winner_id ? [{ playerId: match.winner_id, sourceMatchId: match.id }] : []
        ),
      ...getPendingByeEntrants(eventMatches, currentRound, entries)
    ];
    if (advancementEntrants.length < 2) {
      throw new Error("Tournament event already has a champion");
    }
    await this.query<BracketSlotRow[]>(
      (await this.getClient())
        .from("bracket_slots")
        .insert(buildNextRoundBracketSlotRows(resolvedEventId, currentRound + 1, advancementEntrants))
        .select("*"),
      "advanceBracket.insertSlots"
    );

    const inserted = await this.query<MatchRow[]>(
      (await this.getClient())
        .from("matches")
        .insert(
          buildNextRoundMatchRows(
            resolvedTournamentId,
            event,
            currentRound + 1,
            advancementEntrants.map((entrant) => entrant.playerId)
          )
        )
        .select("*"),
      "advanceBracket.insertMatches"
    );
    const players = await this.loadPlayersByIds(collectPlayerIds(inserted));

    return inserted.map((match) => toMatchSummary(match, players));
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
    if (snapshot.tournament_id) {
      await this.ensureTournamentInOrganization(snapshot.tournament_id, "getRankingSnapshot.tournament");
    } else {
      await this.ensureWeaponInOrganization(snapshot.weapon_type_id, "getRankingSnapshot.weapon");
    }

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

  async listTournamentEventRankingSnapshots(tournamentId: string): Promise<TournamentEventRankingSnapshot[]> {
    const resolvedTournamentId = resolveId(tournamentId);
    await this.ensureTournamentInOrganization(
      resolvedTournamentId,
      "listTournamentEventRankingSnapshots.tournament"
    );
    const snapshots = await this.query<RankingSnapshotRow[]>(
      (await this.getClient())
        .from("ranking_snapshots")
        .select("*")
        .eq("tournament_id", resolvedTournamentId)
        .not("event_id", "is", null)
        .order("generated_at", { ascending: false }),
      "listTournamentEventRankingSnapshots.snapshots"
    );
    const latestSnapshots = collectLatestEventSnapshots(snapshots);
    if (latestSnapshots.length === 0) {
      return [];
    }

    const events = await this.query<TournamentEventRow[]>(
      (await this.getClient())
        .from("tournament_events")
        .select("*")
        .in("id", latestSnapshots.map((snapshot) => snapshot.event_id).filter(Boolean) as string[]),
      "listTournamentEventRankingSnapshots.events"
    );
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const payloads = await Promise.all(
      latestSnapshots.map((snapshot) => this.getRankingSnapshot(snapshot.id))
    );

    return payloads.map((payload, index) => {
      const snapshot = latestSnapshots[index];
      const event = snapshot.event_id ? eventsById.get(snapshot.event_id) : undefined;
      return {
        ...payload,
        eventId: snapshot.event_id ? toPublicId(snapshot.event_id) : "",
        eventName: event?.name ?? "未知项目"
      };
    });
  }

  async buildRankingEngineInput(options: BuildRankingEngineInputOptions) {
    const algorithm = options.algorithm ?? "hybrid";
    const scope = options.scope ?? "tournament";
    const tournamentId = scope === "organization" ? undefined : resolveId(options.tournamentId ?? demoTournamentId);
    const weaponTypeId = resolveId(options.weaponTypeId ?? "weapon-longsword");
    const eventId = options.eventId ? resolveId(options.eventId) : undefined;
    if (tournamentId) {
      await this.ensureTournamentInOrganization(tournamentId, "buildRankingEngineInput.tournament");
    }
    await this.ensureWeaponInOrganization(weaponTypeId, "buildRankingEngineInput.weapon");
    if (eventId && tournamentId) {
      await this.ensureEventInTournament(eventId, tournamentId, weaponTypeId, "buildRankingEngineInput.event");
    } else if (eventId) {
      throw new Error("eventId requires tournament scope");
    }
    const ratings = await this.query<PlayerWeaponRatingRow[]>(
      (await this.getClient()).from("player_weapon_ratings").select("*").eq("weapon_type_id", weaponTypeId),
      "buildRankingEngineInput.ratings"
    );
    const players = await this.loadPlayersByIds(ratings.map((rating) => rating.player_id));
    const scopedRatings = ratings.filter((rating) => players.has(rating.player_id));
    const matchTournamentIds = tournamentId
      ? [tournamentId]
      : await this.listOrganizationTournamentIdsForRanking();
    let matches: MatchRow[] = [];
    if (matchTournamentIds.length > 0) {
      let matchesQuery = (await this.getClient())
        .from("matches")
        .select("*")
        .eq("weapon_type_id", weaponTypeId)
        .in("tournament_id", matchTournamentIds);
      if (eventId) {
        matchesQuery = matchesQuery.eq("event_id", eventId);
      }
      matches = await this.query<MatchRow[]>(
        matchesQuery
          .order("round", { ascending: true })
          .order("created_at", { ascending: true }),
        "buildRankingEngineInput.matches"
      );
    }
    const groupedMatches = groupMatchesByRound(matches, players);

    return {
      tournamentId: tournamentId ? toPublicId(tournamentId) : "organization",
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
    const tournamentId = input.tournamentId && input.tournamentId !== "organization"
      ? resolveId(input.tournamentId)
      : null;
    const weaponTypeId = resolveId(input.weaponTypeId);
    const eventId = input.eventId ? resolveId(input.eventId) : null;
    const organizationId = await this.getOrganizationId();
    await this.ensureWeaponInOrganization(weaponTypeId, "createRankingSnapshot.weapon");
    if (eventId && tournamentId) {
      await this.ensureEventInTournament(eventId, tournamentId, weaponTypeId, "createRankingSnapshot.event");
    } else if (eventId) {
      throw new Error("event ranking snapshot requires a tournament");
    }
    const tournament = tournamentId
      ? await this.querySingle<TournamentRow>(
          (await this.getClient())
            .from("tournaments")
            .select("*")
            .eq("id", tournamentId)
            .eq("organization_id", organizationId)
            .maybeSingle(),
          "createRankingSnapshot.tournament"
        )
      : null;
    if (tournamentId && !tournament) {
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
        tournament ?? undefined,
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

  async listPublicRankingPages(): Promise<PublicRankingPageSummary[]> {
    const organizationId = await this.getOrganizationId();
    const pages = await this.query<PublicPageRow[]>(
      (await this.getClient())
        .from("public_pages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("enabled", true)
        .order("updated_at", { ascending: false }),
      "listPublicRankingPages"
    );

    return pages.map((page) => ({
      pageId: page.page_id,
      title: page.title,
      enabled: page.enabled,
      theme: page.theme,
      tournamentId: page.tournament_id ? toPublicId(page.tournament_id) : "organization",
      defaultWeaponTypeId: page.default_weapon_type_id
        ? toPublicId(page.default_weapon_type_id)
        : undefined,
      updatedAt: page.updated_at
    }));
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

  private async getTournamentSummary(tournamentId: string) {
    const resolvedId = toPublicId(tournamentId);
    const tournament = (await this.listTournaments()).find((item) => item.id === resolvedId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    return tournament;
  }

  private async getTournamentEventSummary(tournamentId: string, eventId: string) {
    const resolvedEventId = toPublicId(eventId);
    const event = (await this.listTournamentEvents(tournamentId)).find((item) => item.id === resolvedEventId);
    if (!event) {
      throw new Error("Tournament event not found");
    }

    return event;
  }

  private async getTournamentEventEntrySummary(tournamentId: string, eventId: string, entryId: string) {
    const entry = (await this.listTournamentEventEntries(tournamentId, eventId)).find((item) => item.id === entryId);
    if (!entry) {
      throw new Error("Tournament event entry not found");
    }

    return entry;
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

  private async ensurePlayerInOrganization(playerId: string, operation: string) {
    const organizationId = await this.getOrganizationId();
    const player = await this.querySingle<Pick<PlayerRow, "id">>(
      (await this.getClient())
        .from("players")
        .select("id")
        .eq("id", playerId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      operation
    );

    if (!player) {
      throw new Error("Player not found in current organization");
    }
  }

  private async getTournamentEventRow(tournamentId: string, eventId: string, operation: string) {
    await this.ensureTournamentInOrganization(tournamentId, `${operation}.tournament`);
    const event = await this.querySingle<TournamentEventRow>(
      (await this.getClient())
        .from("tournament_events")
        .select("*")
        .eq("id", eventId)
        .eq("tournament_id", tournamentId)
        .maybeSingle(),
      operation
    );

    if (!event) {
      throw new Error("Tournament event not found in current tournament");
    }

    return event;
  }

  private async ensurePlayerWeaponRating(playerId: string, weaponTypeId: string) {
    await this.query<null>(
      (await this.getClient())
        .from("player_weapon_ratings")
        .upsert(
          {
            player_id: playerId,
            weapon_type_id: weaponTypeId
          },
          {
            onConflict: "player_id,weapon_type_id",
            ignoreDuplicates: true
          }
        ),
      "ensurePlayerWeaponRating"
    );
  }

  private async ensureEventInCurrentTournament(tournamentId: string, eventId: string, operation: string) {
    await this.ensureTournamentInOrganization(tournamentId, `${operation}.tournament`);
    const event = await this.querySingle<Pick<TournamentEventRow, "id">>(
      (await this.getClient())
        .from("tournament_events")
        .select("id")
        .eq("id", eventId)
        .eq("tournament_id", tournamentId)
        .maybeSingle(),
      operation
    );

    if (!event) {
      throw new Error("Tournament event not found in current tournament");
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

  private async listOrganizationTournamentIdsForRanking() {
    const organizationId = await this.getOrganizationId();
    const tournaments = await this.query<Pick<TournamentRow, "id">[]>(
      (await this.getClient()).from("tournaments").select("id").eq("organization_id", organizationId),
      "listOrganizationTournamentIdsForRanking"
    );

    return tournaments.map((tournament) => tournament.id);
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

  private async ensurePlayersRegisteredForEvent(eventId: string, playerIds: string[]) {
    const entries = await this.query<Pick<TournamentEventEntryRow, "player_id">[]>(
      (await this.getClient())
        .from("tournament_event_entries")
        .select("player_id")
        .eq("event_id", eventId)
        .eq("status", "registered")
        .in("player_id", playerIds),
      "ensurePlayersRegisteredForEvent"
    );
    const registeredPlayerIds = new Set(entries.map((entry) => entry.player_id));

    if (playerIds.some((playerId) => !registeredPlayerIds.has(playerId))) {
      throw new Error("Match players must be registered in the selected tournament event");
    }
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
    tournament: TournamentRow | undefined,
    tournamentId: string | null,
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
          title: tournament ? `${tournament.name} 公开榜单` : "组织长期总榜",
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
    player1Id: toPublicId(match.player1_id),
    player1Name: player1?.name ?? match.player1_id,
    player2Id: toPublicId(match.player2_id),
    player2Name: player2?.name ?? match.player2_id,
    score1: match.score1,
    score2: match.score2,
    winnerId: match.winner_id ? toPublicId(match.winner_id) : undefined,
    winnerName: winner?.name ?? "平局",
    playedAt: match.played_at ?? undefined
  };
}

function toTournamentEventEntrySummary(
  entry: TournamentEventEntryRow,
  players: Map<string, PlayerRow>
) {
  const player = players.get(entry.player_id);
  return {
    id: entry.id,
    eventId: toPublicId(entry.event_id),
    playerId: entry.player_id,
    playerName: player?.name ?? entry.player_id,
    playerClub: player?.club ?? "未知俱乐部",
    seed: entry.seed ?? undefined,
    status: entry.status
  };
}

function toBracketSlotSummary(
  slot: BracketSlotRow,
  players: Map<string, PlayerRow>,
  sourceMatches: Map<string, MatchRow>,
  sourcePlayers: Map<string, PlayerRow>
): BracketSlotSummary {
  const player = slot.player_id ? players.get(slot.player_id) : undefined;
  const sourceMatch = slot.source_match_id ? sourceMatches.get(slot.source_match_id) : undefined;
  const sourcePlayer1 = sourceMatch ? sourcePlayers.get(sourceMatch.player1_id) : undefined;
  const sourcePlayer2 = sourceMatch ? sourcePlayers.get(sourceMatch.player2_id) : undefined;

  return {
    id: slot.id,
    eventId: toPublicId(slot.event_id),
    round: slot.round,
    slotIndex: slot.slot_index,
    playerId: slot.player_id ? toPublicId(slot.player_id) : undefined,
    playerName: player?.name,
    sourceMatchId: slot.source_match_id ?? undefined,
    sourceMatchLabel: sourceMatch
      ? `${sourcePlayer1?.name ?? sourceMatch.player1_id} vs ${sourcePlayer2?.name ?? sourceMatch.player2_id}`
      : undefined,
    status: slot.status
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

function validateMatchResultInput(input: UpdateMatchResultInput) {
  if (!input.id) {
    throw new Error("match id is required");
  }
  if (!input.winnerId) {
    throw new Error("winnerId is required");
  }
  if (!Number.isFinite(input.score1) || !Number.isFinite(input.score2)) {
    throw new Error("score1 and score2 must be numbers");
  }
  if (input.score1 < 0 || input.score2 < 0) {
    throw new Error("score1 and score2 must be non-negative");
  }
  if (input.score1 === input.score2) {
    throw new Error("Single elimination matches require a winner");
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

function normalizeTournamentInput(input: CreateTournamentInput) {
  return {
    name: normalizeRequiredText(input.name, "name"),
    format: normalizeTournamentFormat(input.format),
    status: normalizeLifecycleStatus(input.status),
    defaultAlgorithm: normalizeRankingAlgorithm(input.defaultAlgorithm),
    startedAt: normalizeOptionalDateTime(input.startedAt),
    endedAt: normalizeOptionalDateTime(input.endedAt)
  };
}

function normalizeTournamentUpdate(input: UpdateTournamentInput) {
  const updates: Partial<
    Pick<TournamentRow, "name" | "format" | "status" | "default_algorithm" | "started_at" | "ended_at">
  > = {};

  if (input.name !== undefined) {
    updates.name = normalizeRequiredText(input.name, "name");
  }
  if (input.format !== undefined) {
    updates.format = normalizeTournamentFormat(input.format);
  }
  if (input.status !== undefined) {
    updates.status = normalizeLifecycleStatus(input.status);
  }
  if (input.defaultAlgorithm !== undefined) {
    updates.default_algorithm = normalizeRankingAlgorithm(input.defaultAlgorithm);
  }
  if (input.startedAt !== undefined) {
    updates.started_at = normalizeOptionalDateTime(input.startedAt);
  }
  if (input.endedAt !== undefined) {
    updates.ended_at = normalizeOptionalDateTime(input.endedAt);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one tournament field is required");
  }

  return updates;
}

function normalizeTournamentEventInput(input: CreateTournamentEventInput) {
  return {
    name: normalizeRequiredText(input.name, "name"),
    weaponTypeId: normalizeRequiredText(input.weaponTypeId, "weaponTypeId"),
    format: normalizeTournamentFormat(input.format),
    status: normalizeLifecycleStatus(input.status)
  };
}

function normalizeTournamentEventUpdate(input: UpdateTournamentEventInput) {
  const updates: Partial<Pick<TournamentEventRow, "name" | "weapon_type_id" | "format" | "status">> = {};

  if (input.name !== undefined) {
    updates.name = normalizeRequiredText(input.name, "name");
  }
  if (input.weaponTypeId !== undefined) {
    updates.weapon_type_id = resolveId(normalizeRequiredText(input.weaponTypeId, "weaponTypeId"));
  }
  if (input.format !== undefined) {
    updates.format = normalizeTournamentFormat(input.format);
  }
  if (input.status !== undefined) {
    updates.status = normalizeLifecycleStatus(input.status);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one tournament event field is required");
  }

  return updates;
}

function normalizeTournamentEventEntryInput(input: CreateTournamentEventEntryInput) {
  return {
    playerId: normalizeRequiredText(input.playerId, "playerId"),
    seed: normalizeOptionalSeed(input.seed)
  };
}

function normalizeTournamentEventEntryUpdate(input: UpdateTournamentEventEntryInput) {
  const updates: Partial<Pick<TournamentEventEntryRow, "seed" | "status">> = {};

  if (input.seed !== undefined) {
    updates.seed = normalizeOptionalSeed(input.seed);
  }
  if (input.status !== undefined) {
    updates.status = normalizeTournamentEventEntryStatus(input.status);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one tournament event entry field is required");
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

function normalizeOptionalSeed(value: number | undefined) {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("seed must be a positive integer");
  }

  return value;
}

function normalizeTournamentEventEntryStatus(value: string) {
  if (["registered", "withdrawn"].includes(value)) {
    return value as TournamentEventEntryRow["status"];
  }

  throw new Error("entry status is invalid");
}

function normalizeTournamentFormat(value: string) {
  if (["single_elimination", "round_robin", "swiss", "custom"].includes(value)) {
    return value as TournamentRow["format"];
  }

  throw new Error("format is invalid");
}

function normalizeLifecycleStatus(value: string) {
  if (["draft", "active", "completed"].includes(value)) {
    return value as TournamentRow["status"];
  }

  throw new Error("status is invalid");
}

function normalizeRankingAlgorithm(value: string) {
  if (["elo", "sdr", "glicko2", "hybrid"].includes(value)) {
    return value as TournamentRow["default_algorithm"];
  }

  throw new Error("defaultAlgorithm is invalid");
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalDateTime(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    throw new Error("datetime is invalid");
  }

  return new Date(timestamp).toISOString();
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

function buildSingleEliminationEntryPairs(entries: TournamentEventEntryRow[]) {
  const pairs: Array<[TournamentEventEntryRow, TournamentEventEntryRow]> = [];
  let left = 0;
  let right = entries.length - 1;
  while (left < right) {
    pairs.push([entries[left], entries[right]]);
    left += 1;
    right -= 1;
  }

  return pairs;
}

function buildInitialBracketSlotRows(
  eventId: string,
  entries: TournamentEventEntryRow[],
  pairs: Array<[TournamentEventEntryRow, TournamentEventEntryRow]>
) {
  const pairedPlayerIds = new Set(pairs.flatMap(([player1, player2]) => [player1.player_id, player2.player_id]));
  const byeEntries = entries.filter((entry) => !pairedPlayerIds.has(entry.player_id));
  let slotIndex = 1;

  return [
    ...pairs.flatMap(([player1, player2]) => [
      {
        event_id: eventId,
        round: 1,
        slot_index: slotIndex++,
        player_id: player1.player_id,
        status: "occupied" as const
      },
      {
        event_id: eventId,
        round: 1,
        slot_index: slotIndex++,
        player_id: player2.player_id,
        status: "occupied" as const
      }
    ]),
    ...byeEntries.map((entry) => ({
      event_id: eventId,
      round: 1,
      slot_index: slotIndex++,
      player_id: entry.player_id,
      status: "bye" as const
    }))
  ];
}

function buildRoundRobinEntryPairs(entries: TournamentEventEntryRow[]) {
  const pairs: Array<[TournamentEventEntryRow, TournamentEventEntryRow]> = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      pairs.push([entries[i], entries[j]]);
    }
  }

  return pairs;
}

function buildNextRoundMatchRows(
  tournamentId: string,
  event: TournamentEventRow,
  round: number,
  entrantIds: string[]
) {
  return entrantIds
    .slice(0, Math.floor(entrantIds.length / 2) * 2)
    .reduce<Array<Partial<MatchRow>>>((acc, _winnerId, index, normalizedWinners) => {
      if (index % 2 !== 0) {
        return acc;
      }

      acc.push({
        tournament_id: tournamentId,
        event_id: event.id,
        weapon_type_id: event.weapon_type_id,
        round,
        player1_id: normalizedWinners[index],
        player2_id: normalizedWinners[index + 1],
        score1: 0,
        score2: 0,
        winner_id: null,
        played_at: null
      });

      return acc;
    }, []);
}

function buildNextRoundBracketSlotRows(
  eventId: string,
  round: number,
  entrants: BracketAdvancementEntrant[]
) {
  const pairedCount = Math.floor(entrants.length / 2) * 2;

  return entrants.map((entrant, index) => ({
    event_id: eventId,
    round,
    slot_index: index + 1,
    player_id: entrant.playerId,
    source_match_id: entrant.sourceMatchId,
    status: entrant.sourceMatchId
      ? "advanced" as const
      : index < pairedCount
        ? "occupied" as const
        : "bye" as const
  }));
}

function getPendingByeEntrants(
  eventMatches: MatchRow[],
  currentRound: number,
  entries: TournamentEventEntryRow[]
): BracketAdvancementEntrant[] {
  const currentRoundPlayerIds = new Set(
    eventMatches
      .filter((match) => match.round === currentRound)
      .flatMap((match) => [match.player1_id, match.player2_id])
  );

  if (currentRound === 1) {
    return entries
      .filter((entry) => !currentRoundPlayerIds.has(entry.player_id))
      .map((entry) => ({ playerId: entry.player_id }));
  }

  return eventMatches
    .filter((match) => match.round === currentRound - 1)
    .flatMap((match): BracketAdvancementEntrant[] =>
      match.winner_id ? [{ playerId: match.winner_id, sourceMatchId: match.id }] : []
    )
    .filter((entrant) => !currentRoundPlayerIds.has(entrant.playerId));
}

function collectLatestEventSnapshots(snapshots: RankingSnapshotRow[]) {
  const latestByEvent = new Map<string, RankingSnapshotRow>();
  for (const snapshot of snapshots) {
    if (!snapshot.event_id || latestByEvent.has(snapshot.event_id)) {
      continue;
    }
    latestByEvent.set(snapshot.event_id, snapshot);
  }

  return [...latestByEvent.values()];
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
