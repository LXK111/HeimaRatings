import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { calculateRankingEngine } from "../lib/ranking-engine/calculators.ts";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const defaultImportDir = join(process.cwd(), "data", "import");
const algorithms = new Set(["elo", "sdr", "glicko2", "hybrid"]);
const headerAliases = new Map([
  ["赛事", "tournament_name"],
  ["比赛项目", "event_name"],
  ["轮次", "round"],
  ["选手_a", "player1_name"],
  ["选手a", "player1_name"],
  ["选手_b", "player2_name"],
  ["选手b", "player2_name"],
  ["比分_a", "score1"],
  ["比分a", "score1"],
  ["比分_b", "score2"],
  ["比分b", "score2"],
  ["player_a", "player1_name"],
  ["player_b", "player2_name"],
  ["score_a", "score1"],
  ["score_b", "score2"]
]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = readConfig(options);
  const source = resolveImportSource(options);
  const dataset = readImportDataset(source);
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log("HEMA Ratings data import");
  console.log(`mode: ${options.apply ? "apply" : "dry-run"}`);
  console.log(`organization: ${config.organizationSlug}`);
  console.log(`${source.kind}: ${source.path}`);

  const context = await loadImportContext(supabase, config.organizationSlug);
  const plan = buildImportPlan(dataset, context);
  printPlan(plan);

  if (!options.apply) {
    console.log("Dry-run complete. Re-run with --apply to write data.");
    return;
  }

  await applyImportPlan(supabase, context, plan, options.algorithm);
  console.log("Data import applied.");
}

function resolveImportSource(options) {
  if (options.file && options.dir) {
    throw new Error("--file and --dir cannot be used together");
  }
  if (options.file) {
    return { kind: "file", path: resolve(process.cwd(), options.file) };
  }

  return { kind: "directory", path: resolve(process.cwd(), options.dir ?? defaultImportDir) };
}

function readImportDataset(source) {
  if (!existsSync(source.path)) {
    throw new Error(`Import ${source.kind} was not found: ${source.path}`);
  }
  if (source.kind === "file") {
    return readWorkbookDataset(source.path);
  }

  return {
    players: readOptionalCsv(source.path, "players.csv", ["name"]),
    ratings: readOptionalCsv(source.path, "ratings.csv", ["player_name", "weapon_slug"]),
    entries: readOptionalCsv(source.path, "event_entries.csv", ["player_name"]),
    matches: readOptionalCsv(source.path, "matches.csv", [
      "tournament_name",
      "event_name",
      "round",
      "player1_name",
      "player2_name",
      "score1",
      "score2"
    ])
  };
}

function readWorkbookDataset(filePath) {
  if (extname(filePath).toLowerCase() !== ".xlsx") {
    throw new Error("--file currently supports .xlsx workbooks only");
  }
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetByName = new Map(workbook.SheetNames.map((name) => [normalizeHeader(name), workbook.Sheets[name]]));
  return {
    players: readOptionalWorksheet(sheetByName, "players", ["name"]),
    ratings: readOptionalWorksheet(sheetByName, "ratings", ["player_name", "weapon_slug"]),
    entries: readOptionalWorksheet(sheetByName, "event_entries", ["player_name"]),
    matches: readOptionalWorksheet(sheetByName, "matches", [
      "tournament_name",
      "event_name",
      "round",
      "player1_name",
      "player2_name",
      "score1",
      "score2"
    ])
  };
}

async function loadImportContext(supabase, organizationSlug) {
  const organization = await querySingle(
    supabase.from("organizations").select("id,slug,name").eq("slug", organizationSlug).maybeSingle(),
    `organization ${organizationSlug}`
  );
  const playerIds = await loadPlayerIdsForOrganization(supabase, organization.id);
  const [weapons, players, ratings, eventRows, tournamentRows] = await Promise.all([
    queryMany(
      supabase.from("weapon_types").select("id,name,slug,enabled").eq("organization_id", organization.id),
      "load weapons"
    ),
    queryMany(
      supabase.from("players").select("id,name,club").eq("organization_id", organization.id),
      "load players"
    ),
    playerIds.length > 0
      ? queryMany(
        supabase
          .from("player_weapon_ratings")
          .select("id,player_id,weapon_type_id,current_rating,rd,sigma")
          .in("player_id", playerIds),
        "load player weapon ratings"
      )
      : [],
    queryMany(
      supabase
        .from("tournament_events")
        .select("id,name,tournament_id,weapon_type_id,tournaments!inner(id,name,organization_id)")
        .eq("tournaments.organization_id", organization.id),
      "load tournament events"
    ),
    queryMany(
      supabase.from("tournaments").select("id,name").eq("organization_id", organization.id),
      "load tournaments"
    )
  ]);
  const existingPlayerIds = players.map((player) => player.id);
  const entries = existingPlayerIds.length > 0
    ? await queryMany(
      supabase
        .from("tournament_event_entries")
        .select("id,event_id,player_id,seed,status")
        .in("player_id", existingPlayerIds),
      "load tournament event entries"
    )
    : [];
  const matches = tournamentRows.length > 0
    ? await queryMany(
      supabase
        .from("matches")
        .select("id,tournament_id,event_id,weapon_type_id,round,player1_id,player2_id,score1,score2")
        .in("tournament_id", tournamentRows.map((tournament) => tournament.id)),
      "load matches"
    )
    : [];

  return {
    organization,
    weaponsById: new Map(weapons.map((weapon) => [weapon.id, weapon])),
    weaponsBySlug: new Map(weapons.map((weapon) => [weapon.slug, weapon])),
    tournamentsById: new Map(tournamentRows.map((tournament) => [tournament.id, tournament])),
    playersByName: new Map(players.map((player) => [player.name, player])),
    playersById: new Map(players.map((player) => [player.id, player])),
    ratingsByPlayerWeapon: new Map(
      ratings.map((rating) => [`${rating.player_id}:${rating.weapon_type_id}`, rating])
    ),
    eventsById: new Map(eventRows.map((event) => [event.id, toEventContext(event)])),
    eventsByNameKey: new Map(
      eventRows.map((event) => [eventNameKey(event.tournaments.name, event.name), toEventContext(event)])
    ),
    entriesByEventPlayer: new Map(
      entries.map((entry) => [`${entry.event_id}:${entry.player_id}`, entry])
    ),
    matchesByEventRoundPlayers: new Map(
      matches.map((match) => [matchKey(match.event_id, match.round, match.player1_id, match.player2_id), match])
    )
  };
}

async function loadPlayerIdsForOrganization(supabase, organizationId) {
  const players = await queryMany(
    supabase.from("players").select("id").eq("organization_id", organizationId),
    "load player ids"
  );
  return players.map((player) => player.id);
}

function buildImportPlan(dataset, context) {
  const playerPlans = dataset.players.map((row) => planPlayer(row, context));
  const plannedPlayersByName = new Map(
    playerPlans.map((plan) => [plan.name, { id: plan.existing?.id, name: plan.name, club: plan.club }])
  );
  const resolvePlayer = (name, rowLabel) =>
    context.playersByName.get(name) ?? plannedPlayersByName.get(name) ?? fail(`${rowLabel}: player not found: ${name}`);

  const ratingPlans = dataset.ratings.map((row, index) => {
    const rowLabel = `ratings:${index + 2}`;
    const playerName = requiredValue(row.player_name, `${rowLabel} player_name`);
    const weaponSlug = requiredValue(row.weapon_slug, `${rowLabel} weapon_slug`);
    const player = resolvePlayer(playerName, rowLabel);
    const weapon = context.weaponsBySlug.get(weaponSlug);
    if (!weapon) {
      throw new Error(`${rowLabel}: weapon_slug not found in organization: ${weaponSlug}`);
    }
    if (!weapon.enabled) {
      throw new Error(`${rowLabel}: weapon is disabled: ${weaponSlug}`);
    }

    return {
      rowLabel,
      action: player.id && context.ratingsByPlayerWeapon.has(`${player.id}:${weapon.id}`) ? "update" : "create",
      playerName,
      weaponSlug,
      player,
      weapon,
      values: normalizeRatingRow(row, rowLabel)
    };
  });

  const entryPlans = dataset.entries.map((row, index) => {
    const rowLabel = `event_entries:${index + 2}`;
    const playerName = requiredValue(row.player_name, `${rowLabel} player_name`);
    const player = resolvePlayer(playerName, rowLabel);
    const event = resolveEvent(row, context, rowLabel);
    const existing = player.id
      ? context.entriesByEventPlayer.get(`${event.id}:${player.id}`)
      : undefined;

    return {
      rowLabel,
      action: existing ? "update" : "create",
      event,
      player,
      playerName,
      seed: optionalPositiveInteger(row.seed, `${rowLabel} seed`),
      status: optionalStatus(row.status, `${rowLabel} status`)
    };
  });

  const plannedRegisteredEntries = new Set(
    entryPlans
      .filter((entry) => entry.status === "registered")
      .map((entry) => eventPlayerNameKey(entry.event.id, entry.playerName))
  );
  const plannedWithdrawnEntries = new Set(
    entryPlans
      .filter((entry) => entry.status === "withdrawn")
      .map((entry) => eventPlayerNameKey(entry.event.id, entry.playerName))
  );
  const importMatchKeys = new Set();
  const matchPlans = dataset.matches.map((row, index) => {
    const rowLabel = `matches:${index + 2}`;
    const event = resolveEvent(row, context, rowLabel);
    const player1Name = requiredValue(row.player1_name, `${rowLabel} player1_name`);
    const player2Name = requiredValue(row.player2_name, `${rowLabel} player2_name`);
    if (player1Name === player2Name) {
      throw new Error(`${rowLabel}: player1_name and player2_name must be different`);
    }
    const player1 = resolvePlayer(player1Name, rowLabel);
    const player2 = resolvePlayer(player2Name, rowLabel);
    assertRegisteredForEvent(context, plannedRegisteredEntries, plannedWithdrawnEntries, event, player1, rowLabel);
    assertRegisteredForEvent(context, plannedRegisteredEntries, plannedWithdrawnEntries, event, player2, rowLabel);

    const round = requiredPositiveInteger(row.round, `${rowLabel} round`);
    const score1 = requiredNonNegativeInteger(row.score1, `${rowLabel} score1`);
    const score2 = requiredNonNegativeInteger(row.score2, `${rowLabel} score2`);
    const importKey = eventPlayerNameRoundKey(event.id, round, player1Name, player2Name);
    if (importMatchKeys.has(importKey)) {
      throw new Error(`${rowLabel}: duplicated match in import file`);
    }
    importMatchKeys.add(importKey);

    return {
      rowLabel,
      action: "create",
      event,
      player1Name,
      player2Name,
      round,
      score1,
      score2
    };
  });

  return {
    players: playerPlans,
    ratings: ratingPlans,
    entries: entryPlans,
    matches: matchPlans
  };
}

function planPlayer(row, context) {
  const name = requiredValue(row.name, "players name");
  const club = optionalText(row.club);
  const existing = context.playersByName.get(name);
  const action = existing ? (club !== undefined && club !== (existing.club ?? "") ? "update" : "skip") : "create";

  return {
    action,
    existing,
    name,
    club
  };
}

async function applyImportPlan(supabase, context, plan, algorithm) {
  for (const player of plan.players) {
    if (player.action === "create") {
      const inserted = await querySingle(
        supabase
          .from("players")
          .insert({
            organization_id: context.organization.id,
            name: player.name,
            club: player.club ?? null
          })
          .select("id,name,club")
          .single(),
        `insert player ${player.name}`
      );
      player.existing = inserted;
      context.playersByName.set(inserted.name, inserted);
      context.playersById.set(inserted.id, inserted);
      continue;
    }
    if (player.action === "update") {
      const updated = await querySingle(
        supabase
          .from("players")
          .update({ club: player.club ?? null })
          .eq("id", player.existing.id)
          .select("id,name,club")
          .single(),
        `update player ${player.name}`
      );
      player.existing = updated;
      context.playersByName.set(updated.name, updated);
      context.playersById.set(updated.id, updated);
    }
  }

  // Ratings reference players that may have been created earlier in this same import.
  for (const rating of plan.ratings) {
    const player = context.playersByName.get(rating.playerName);
    if (!player) {
      throw new Error(`${rating.rowLabel}: player disappeared before rating import: ${rating.playerName}`);
    }
    const values = {
      player_id: player.id,
      weapon_type_id: rating.weapon.id,
      ...rating.values
    };
    const upserted = await querySingle(
      supabase
        .from("player_weapon_ratings")
        .upsert(values, { onConflict: "player_id,weapon_type_id" })
        .select("id,player_id,weapon_type_id,current_rating,rd,sigma")
        .single(),
      `${rating.action} rating ${rating.playerName}/${rating.weaponSlug}`
    );
    context.ratingsByPlayerWeapon.set(`${upserted.player_id}:${upserted.weapon_type_id}`, upserted);
  }

  for (const entry of plan.entries) {
    const player = context.playersByName.get(entry.playerName);
    if (!player) {
      throw new Error(`${entry.rowLabel}: player disappeared before entry import: ${entry.playerName}`);
    }
    const upserted = await querySingle(
      supabase
        .from("tournament_event_entries")
        .upsert(
          {
            event_id: entry.event.id,
            player_id: player.id,
            seed: entry.seed,
            status: entry.status
          },
          { onConflict: "event_id,player_id" }
        )
        .select("id,event_id,player_id,seed,status")
        .single(),
      `${entry.action} entry ${entry.playerName}/${entry.event.name}`
    );
    context.entriesByEventPlayer.set(`${upserted.event_id}:${upserted.player_id}`, upserted);
  }

  const affectedWeaponIds = new Set();
  let insertedMatches = 0;
  let skippedMatches = 0;
  for (const match of plan.matches) {
    const player1 = context.playersByName.get(match.player1Name);
    const player2 = context.playersByName.get(match.player2Name);
    if (!player1 || !player2) {
      throw new Error(`${match.rowLabel}: player disappeared before match import`);
    }
    assertStoredEntryIsRegistered(context, match.event, player1, match.rowLabel);
    assertStoredEntryIsRegistered(context, match.event, player2, match.rowLabel);

    const existing = context.matchesByEventRoundPlayers.get(matchKey(
      match.event.id,
      match.round,
      player1.id,
      player2.id
    ));
    if (existing) {
      if (
        existing.score1 === match.score1 &&
        existing.score2 === match.score2 &&
        existing.player1_id === player1.id &&
        existing.player2_id === player2.id
      ) {
        skippedMatches += 1;
        continue;
      }
      throw new Error(`${match.rowLabel}: match already exists with different result`);
    }

    const inserted = await querySingle(
      supabase
        .from("matches")
        .insert({
          tournament_id: match.event.tournamentId,
          event_id: match.event.id,
          weapon_type_id: match.event.weaponTypeId,
          round: match.round,
          player1_id: player1.id,
          player2_id: player2.id,
          score1: match.score1,
          score2: match.score2,
          winner_id: resolveWinnerId(match, player1.id, player2.id),
          played_at: new Date().toISOString()
        })
        .select("id,tournament_id,event_id,weapon_type_id,round,player1_id,player2_id,score1,score2")
        .single(),
      `insert match ${match.player1Name}/${match.player2Name}`
    );
    insertedMatches += 1;
    affectedWeaponIds.add(match.event.weaponTypeId);
    context.matchesByEventRoundPlayers.set(
      matchKey(inserted.event_id, inserted.round, inserted.player1_id, inserted.player2_id),
      inserted
    );
  }

  if (plan.matches.length > 0) {
    console.log(`matches applied: ${insertedMatches} create, ${skippedMatches} skip`);
  }
  for (const weaponTypeId of affectedWeaponIds) {
    await recalculateLongTermRatings(supabase, context, weaponTypeId, algorithm);
  }
}

async function recalculateLongTermRatings(supabase, context, weaponTypeId, algorithm) {
  const tournamentIds = Array.from(context.tournamentsById.keys());
  const matches = tournamentIds.length > 0
    ? await queryMany(
      supabase
        .from("matches")
        .select("id,round,player1_id,player2_id,score1,score2")
        .eq("weapon_type_id", weaponTypeId)
        .in("tournament_id", tournamentIds)
        .order("round", { ascending: true })
        .order("created_at", { ascending: true }),
      `load matches for ${weaponTypeId}`
    )
    : [];
  const matchedPlayerIds = collectMatchPlayerIds(matches);
  const ratings = matchedPlayerIds.length > 0
    ? await queryMany(
      supabase
        .from("player_weapon_ratings")
        .select("id,player_id,weapon_type_id,current_rating,rd,sigma")
        .eq("weapon_type_id", weaponTypeId)
        .in("player_id", matchedPlayerIds),
      `load ratings for ${weaponTypeId}`
    )
    : [];
  const ratingsByPlayerId = new Map(ratings.map((rating) => [rating.player_id, rating]));
  const input = {
    tournamentId: "organization",
    weaponTypeId,
    algorithm,
    players: matchedPlayerIds.map((playerId) => {
      const player = context.playersById.get(playerId);
      const rating = ratingsByPlayerId.get(playerId);
      return {
        id: playerId,
        name: player?.name ?? playerId,
        rating: Number(rating?.current_rating ?? 1500),
        rd: Number(rating?.rd ?? 350),
        sigma: Number(rating?.sigma ?? 0.2)
      };
    }),
    matches: groupMatchesByRound(matches, context.playersById)
  };
  const output = calculateRankingEngine(input);
  const rows = output.rankings.map((ranking) => ({
    player_id: ranking.playerId,
    weapon_type_id: weaponTypeId,
    current_rating: ranking.rating,
    rd: ranking.rd ?? 350,
    sigma: ranking.sigma ?? 0.2,
    matches_count: ranking.matches,
    wins_count: ranking.wins,
    losses_count: ranking.losses,
    draws_count: ranking.draws
  }));

  if (rows.length > 0) {
    await expectMutation(
      supabase.from("player_weapon_ratings").upsert(rows, { onConflict: "player_id,weapon_type_id" }),
      `update long-term ratings for ${context.weaponsById.get(weaponTypeId)?.slug ?? weaponTypeId}`
    );
  }
  console.log(`long-term ratings recalculated: ${context.weaponsById.get(weaponTypeId)?.slug ?? weaponTypeId}`);
}

function resolveEvent(row, context, rowLabel) {
  const eventId = optionalText(row.event_id);
  if (eventId) {
    const event = context.eventsById.get(eventId);
    if (!event) {
      throw new Error(`${rowLabel}: event_id not found in organization: ${eventId}`);
    }
    return event;
  }

  const tournamentName = requiredValue(row.tournament_name, `${rowLabel} tournament_name`);
  const eventName = requiredValue(row.event_name, `${rowLabel} event_name`);
  const event = context.eventsByNameKey.get(eventNameKey(tournamentName, eventName));
  if (!event) {
    throw new Error(`${rowLabel}: event not found: ${tournamentName} / ${eventName}`);
  }

  return event;
}

function normalizeRatingRow(row, rowLabel) {
  const initialRating = optionalNumber(row.initial_rating, `${rowLabel} initial_rating`) ?? 1500;
  return {
    initial_rating: initialRating,
    current_rating: optionalNumber(row.current_rating, `${rowLabel} current_rating`) ?? initialRating,
    rd: optionalNumber(row.rd, `${rowLabel} rd`) ?? 350,
    sigma: optionalNumber(row.sigma, `${rowLabel} sigma`) ?? 0.2,
    matches_count: optionalNonNegativeInteger(row.matches_count, `${rowLabel} matches_count`) ?? 0,
    wins_count: optionalNonNegativeInteger(row.wins_count, `${rowLabel} wins_count`) ?? 0,
    losses_count: optionalNonNegativeInteger(row.losses_count, `${rowLabel} losses_count`) ?? 0,
    draws_count: optionalNonNegativeInteger(row.draws_count, `${rowLabel} draws_count`) ?? 0
  };
}

function printPlan(plan) {
  const playerCounts = countActions(plan.players);
  const ratingCounts = countActions(plan.ratings);
  const entryCounts = countActions(plan.entries);
  const matchCounts = countActions(plan.matches);

  console.log(
    `players: ${playerCounts.create} create, ${playerCounts.update} update, ${playerCounts.skip} skip`
  );
  console.log(`ratings: ${ratingCounts.create} create, ${ratingCounts.update} update`);
  console.log(`entries: ${entryCounts.create} create, ${entryCounts.update} update`);
  console.log(`matches: ${matchCounts.create} create`);
}

function countActions(items) {
  return items.reduce(
    (acc, item) => {
      acc[item.action] = (acc[item.action] ?? 0) + 1;
      return acc;
    },
    { create: 0, update: 0, skip: 0 }
  );
}

function readOptionalCsv(importDir, fileName, requiredHeaders) {
  const filePath = join(importDir, fileName);
  if (!existsSync(filePath)) {
    return [];
  }

  const rows = parseCsv(readFileSync(filePath, "utf8"), fileName);
  assertRequiredHeaders(rows.headers, requiredHeaders, fileName);
  return rows.records;
}

function readOptionalWorksheet(sheetByName, sheetName, requiredHeaders) {
  const sheet = sheetByName.get(normalizeHeader(sheetName));
  if (!sheet) {
    return [];
  }
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const rows = rowsToRecords(rawRows, sheetName);
  assertRequiredHeaders(rows.headers, requiredHeaders, sheetName);
  return rows.records;
}

function parseCsv(content, fileName) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }
  row.push(current);
  rows.push(row);

  return rowsToRecords(rows, fileName);
}

function rowsToRecords(rows, fileName) {
  const normalizedRows = rows
    .map((items) => items.map((item) => String(item ?? "").trim()))
    .filter((items) => items.some((item) => item !== ""));
  if (normalizedRows.length === 0) {
    return { headers: [], records: [] };
  }
  const headers = normalizedRows[0].map((header) => normalizeHeader(header));
  if (headers.some((header) => !header)) {
    throw new Error(`${fileName} contains an empty header`);
  }

  return {
    headers,
    records: normalizedRows.slice(1).map((items, index) => {
      if (items.length > headers.length) {
        throw new Error(`${fileName}:${index + 2} has more cells than headers`);
      }
      return Object.fromEntries(headers.map((header, cellIndex) => [header, items[cellIndex] ?? ""]));
    })
  };
}

function assertRequiredHeaders(headers, requiredHeaders, fileName) {
  for (const header of requiredHeaders) {
    if (headers.length > 0 && !headers.includes(header)) {
      throw new Error(`${fileName} missing required header: ${header}`);
    }
  }
}

function normalizeHeader(header) {
  const normalized = String(header).trim().toLowerCase().replace(/\s+/g, "_");
  return headerAliases.get(normalized) ?? normalized;
}

function toEventContext(event) {
  return {
    id: event.id,
    name: event.name,
    tournamentId: event.tournament_id,
    tournamentName: event.tournaments.name,
    weaponTypeId: event.weapon_type_id
  };
}

function groupMatchesByRound(matches, playersById) {
  const grouped = new Map();
  for (const match of matches) {
    const player1 = playersById.get(match.player1_id);
    const player2 = playersById.get(match.player2_id);
    if (!player1 || !player2) {
      continue;
    }
    const round = grouped.get(match.round) ?? [];
    round.push({
      id: match.id,
      round: match.round,
      player1: player1.name,
      player2: player2.name,
      score1: Number(match.score1),
      score2: Number(match.score2)
    });
    grouped.set(match.round, round);
  }
  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([, round]) => round);
}

function collectMatchPlayerIds(matches) {
  const ids = new Set();
  for (const match of matches) {
    ids.add(match.player1_id);
    ids.add(match.player2_id);
  }
  return Array.from(ids);
}

function eventNameKey(tournamentName, eventName) {
  return `${tournamentName}::${eventName}`;
}

function eventPlayerNameKey(eventId, playerName) {
  return `${eventId}:${playerName}`;
}

function eventPlayerNameRoundKey(eventId, round, player1Name, player2Name) {
  return `${eventId}:${round}:${[player1Name, player2Name].sort().join("::")}`;
}

function matchKey(eventId, round, player1Id, player2Id) {
  return `${eventId}:${round}:${[player1Id, player2Id].sort().join("::")}`;
}

function assertRegisteredForEvent(context, plannedRegisteredEntries, plannedWithdrawnEntries, event, player, rowLabel) {
  const plannedNameKey = eventPlayerNameKey(event.id, player.name);
  if (plannedWithdrawnEntries.has(plannedNameKey)) {
    throw new Error(`${rowLabel}: player is withdrawn from event: ${player.name}`);
  }
  if (plannedRegisteredEntries.has(plannedNameKey)) {
    return;
  }
  if (!player.id) {
    throw new Error(`${rowLabel}: player must be registered before importing match: ${player.name}`);
  }
  const existing = context.entriesByEventPlayer.get(`${event.id}:${player.id}`);
  if (!existing || existing.status !== "registered") {
    throw new Error(`${rowLabel}: player must be registered for event before importing match: ${player.name}`);
  }
}

function assertStoredEntryIsRegistered(context, event, player, rowLabel) {
  const entry = context.entriesByEventPlayer.get(`${event.id}:${player.id}`);
  if (!entry || entry.status !== "registered") {
    throw new Error(`${rowLabel}: player is not registered for event: ${player.name}`);
  }
}

function resolveWinnerId(match, player1Id, player2Id) {
  if (match.score1 === match.score2) {
    return null;
  }
  return match.score1 > match.score2 ? player1Id : player2Id;
}

function optionalText(value) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function requiredValue(value, label) {
  const text = optionalText(value);
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function optionalNumber(value, label) {
  const text = optionalText(value);
  if (text === undefined) {
    return undefined;
  }
  const number = Number(text);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return number;
}

function optionalNonNegativeInteger(value, label) {
  const number = optionalNumber(value, label);
  if (number === undefined) {
    return undefined;
  }
  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return number;
}

function requiredNonNegativeInteger(value, label) {
  const number = optionalNonNegativeInteger(value, label);
  if (number === undefined) {
    throw new Error(`${label} is required`);
  }
  return number;
}

function optionalPositiveInteger(value, label) {
  const number = optionalNonNegativeInteger(value, label);
  if (number === undefined) {
    return null;
  }
  if (number <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return number;
}

function requiredPositiveInteger(value, label) {
  const number = optionalPositiveInteger(value, label);
  if (number === null) {
    throw new Error(`${label} is required`);
  }
  return number;
}

function optionalStatus(value, label) {
  const status = optionalText(value) ?? "registered";
  if (!["registered", "withdrawn"].includes(status)) {
    throw new Error(`${label} must be registered or withdrawn`);
  }
  return status;
}

function parseArgs(args) {
  const options = { apply: false, algorithm: "hybrid" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--dir") {
      options.dir = requireArgValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--file") {
      options.file = requireArgValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--algorithm") {
      const algorithm = requireArgValue(args, index, arg);
      if (!algorithms.has(algorithm)) {
        throw new Error("--algorithm must be one of elo, sdr, glicko2, hybrid");
      }
      options.algorithm = algorithm;
      index += 1;
      continue;
    }
    if (arg === "--organization-slug") {
      options.organizationSlug = requireArgValue(args, index, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireArgValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function readConfig(options) {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    organizationSlug:
      options.organizationSlug ??
      process.env.HEIMA_RATINGS_IMPORT_ORGANIZATION_SLUG ??
      process.env.HEIMA_RATINGS_RLS_ORGANIZATION_SLUG ??
      "hema-ratings-demo"
  };
}

async function querySingle(builder, label) {
  const { data, error } = await builder;
  if (error || !data) {
    throw new Error(`${label} failed: ${error?.message ?? "not found"}`);
  }
  return data;
}

async function queryMany(builder, label) {
  const { data, error } = await builder;
  if (error || !Array.isArray(data)) {
    throw new Error(`${label} failed: ${error?.message ?? "missing rows"}`);
  }
  return data;
}

async function expectMutation(builder, label) {
  const { error } = await builder;
  if (error) {
    throw new Error(`${label} failed: ${error.message}`);
  }
}

function fail(message) {
  throw new Error(message);
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function loadLocalEnvFile(fileName) {
  const filePath = join(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) {
      continue;
    }
    process.env[parsed.key] = parsed.value;
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return undefined;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
