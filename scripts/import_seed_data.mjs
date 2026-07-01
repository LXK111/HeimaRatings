import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const defaultImportDir = join(process.cwd(), "data", "import");

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = readConfig(options);
  const importDir = resolve(process.cwd(), options.dir ?? defaultImportDir);
  const dataset = readImportDataset(importDir);
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log("HEMA Ratings data import");
  console.log(`mode: ${options.apply ? "apply" : "dry-run"}`);
  console.log(`organization: ${config.organizationSlug}`);
  console.log(`directory: ${importDir}`);

  const context = await loadImportContext(supabase, config.organizationSlug);
  const plan = buildImportPlan(dataset, context);
  printPlan(plan);

  if (!options.apply) {
    console.log("Dry-run complete. Re-run with --apply to write data.");
    return;
  }

  await applyImportPlan(supabase, context, plan);
  console.log("Data import applied.");
}

function readImportDataset(importDir) {
  if (!existsSync(importDir)) {
    throw new Error(`Import directory was not found: ${importDir}`);
  }

  return {
    players: readOptionalCsv(importDir, "players.csv", ["name"]),
    ratings: readOptionalCsv(importDir, "ratings.csv", ["player_name", "weapon_slug"]),
    entries: readOptionalCsv(importDir, "event_entries.csv", ["player_name"])
  };
}

async function loadImportContext(supabase, organizationSlug) {
  const organization = await querySingle(
    supabase.from("organizations").select("id,slug,name").eq("slug", organizationSlug).maybeSingle(),
    `organization ${organizationSlug}`
  );
  const playerIds = await loadPlayerIdsForOrganization(supabase, organization.id);
  const [weapons, players, ratings, eventRows] = await Promise.all([
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
          .select("id,player_id,weapon_type_id")
          .in("player_id", playerIds),
        "load player weapon ratings"
      )
      : [],
    queryMany(
      supabase
        .from("tournament_events")
        .select("id,name,tournament_id,tournaments!inner(id,name,organization_id)")
        .eq("tournaments.organization_id", organization.id),
      "load tournament events"
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

  return {
    organization,
    weaponsBySlug: new Map(weapons.map((weapon) => [weapon.slug, weapon])),
    playersByName: new Map(players.map((player) => [player.name, player])),
    ratingsByPlayerWeapon: new Map(
      ratings.map((rating) => [`${rating.player_id}:${rating.weapon_type_id}`, rating])
    ),
    eventsById: new Map(eventRows.map((event) => [event.id, toEventContext(event)])),
    eventsByNameKey: new Map(
      eventRows.map((event) => [eventNameKey(event.tournaments.name, event.name), toEventContext(event)])
    ),
    entriesByEventPlayer: new Map(
      entries.map((entry) => [`${entry.event_id}:${entry.player_id}`, entry])
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
    const rowLabel = `ratings.csv:${index + 2}`;
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
    const rowLabel = `event_entries.csv:${index + 2}`;
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
      seed: optionalPositiveInteger(row.seed, `${rowLabel} seed`),
      status: optionalStatus(row.status, `${rowLabel} status`)
    };
  });

  return {
    players: playerPlans,
    ratings: ratingPlans,
    entries: entryPlans
  };
}

function planPlayer(row, context) {
  const name = requiredValue(row.name, "players.csv name");
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

async function applyImportPlan(supabase, context, plan) {
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
    await expectMutation(
      supabase.from("player_weapon_ratings").upsert(values, { onConflict: "player_id,weapon_type_id" }),
      `${rating.action} rating ${rating.playerName}/${rating.weaponSlug}`
    );
  }

  for (const entry of plan.entries) {
    const player = context.playersByName.get(entry.player.name);
    if (!player) {
      throw new Error(`${entry.rowLabel}: player disappeared before entry import: ${entry.player.name}`);
    }
    await expectMutation(
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
        ),
      `${entry.action} entry ${entry.player.name}/${entry.event.name}`
    );
  }
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

  console.log(
    `players: ${playerCounts.create} create, ${playerCounts.update} update, ${playerCounts.skip} skip`
  );
  console.log(`ratings: ${ratingCounts.create} create, ${ratingCounts.update} update`);
  console.log(`entries: ${entryCounts.create} create, ${entryCounts.update} update`);
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
  for (const header of requiredHeaders) {
    if (rows.headers.length > 0 && !rows.headers.includes(header)) {
      throw new Error(`${fileName} missing required header: ${header}`);
    }
  }

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

  const nonEmptyRows = rows.filter((items) => items.some((item) => item.trim() !== ""));
  if (nonEmptyRows.length === 0) {
    return { headers: [], records: [] };
  }
  const headers = nonEmptyRows[0].map((header) => normalizeHeader(header));
  if (headers.some((header) => !header)) {
    throw new Error(`${fileName} contains an empty header`);
  }

  return {
    headers,
    records: nonEmptyRows.slice(1).map((items, index) => {
      if (items.length > headers.length) {
        throw new Error(`${fileName}:${index + 2} has more cells than headers`);
      }
      return Object.fromEntries(headers.map((header, cellIndex) => [header, items[cellIndex]?.trim() ?? ""]));
    })
  };
}

function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function toEventContext(event) {
  return {
    id: event.id,
    name: event.name,
    tournamentId: event.tournament_id,
    tournamentName: event.tournaments.name
  };
}

function eventNameKey(tournamentName, eventName) {
  return `${tournamentName}::${eventName}`;
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

function optionalStatus(value, label) {
  const status = optionalText(value) ?? "registered";
  if (!["registered", "withdrawn"].includes(status)) {
    throw new Error(`${label} must be registered or withdrawn`);
  }
  return status;
}

function parseArgs(args) {
  const options = { apply: false };
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
