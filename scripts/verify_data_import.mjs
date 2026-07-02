import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

async function main() {
  console.log("HEMA Ratings data import verify");
  const config = readConfig();
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  await runImportScenario(supabase, "csv");
  await runImportScenario(supabase, "xlsx");

  console.log("Data import verify passed.");
}

async function runImportScenario(supabase, kind) {
  const created = {
    organizationId: undefined,
    organizationSlug: `stage58-${kind}-${randomUUID().slice(0, 8)}`
  };

  try {
    const seed = await seedImportTarget(supabase, created, kind);
    const source = kind === "xlsx" ? writeImportWorkbook(seed) : writeImportCsvFiles(seed);
    const sourceArgs = kind === "xlsx" ? ["--file", source] : ["--dir", source];
    await runCommand("npm", [
      "run",
      "data:import",
      "--",
      ...sourceArgs,
      "--organization-slug",
      created.organizationSlug,
      "--apply"
    ]);
    await verifyImportedData(supabase, seed);
  } finally {
    await cleanupSeedData(supabase, created);
  }
}

async function seedImportTarget(supabase, created, kind) {
  const organization = await querySingle(
    supabase
      .from("organizations")
      .insert({ name: `Stage 58 ${kind.toUpperCase()} 数据导入验收组织`, slug: created.organizationSlug })
      .select("id,slug")
      .single(),
    "seed organization"
  );
  created.organizationId = organization.id;
  const weapon = await querySingle(
    supabase
      .from("weapon_types")
      .insert({
        organization_id: organization.id,
        name: `阶段58${kind.toUpperCase()}长剑`,
        slug: `stage58-${kind}-longsword`,
        enabled: true,
        sort_order: 1
      })
      .select("id,slug")
      .single(),
    "seed weapon"
  );
  const tournament = await querySingle(
    supabase
      .from("tournaments")
      .insert({
        organization_id: organization.id,
        name: `Stage 58 ${kind.toUpperCase()} 数据导入验收赛`,
        format: "single_elimination",
        status: "active",
        default_algorithm: "hybrid"
      })
      .select("id,name")
      .single(),
    "seed tournament"
  );
  const event = await querySingle(
    supabase
      .from("tournament_events")
      .insert({
        tournament_id: tournament.id,
        weapon_type_id: weapon.id,
        name: `阶段58${kind.toUpperCase()}长剑公开组`,
        format: "single_elimination",
        status: "active"
      })
      .select("id,name")
      .single(),
    "seed event"
  );

  console.log(`data import target seed (${kind}): ok`);
  return {
    organization,
    weapon,
    tournament,
    event,
    players: [`阶段58${kind}沈砺`, `阶段58${kind}韩越`]
  };
}

function writeImportCsvFiles(seed) {
  const importDir = mkdtempSync(join(tmpdir(), "heima-ratings-import-"));
  writeFileSync(join(importDir, "players.csv"), toCsv([
    ["name", "club"],
    [seed.players[0], "验收剑馆"],
    [seed.players[1], "验收剑馆"]
  ]));
  writeFileSync(join(importDir, "event_entries.csv"), toCsv([
    ["tournament_name", "event_name", "player_name", "seed", "status"],
    [seed.tournament.name, seed.event.name, seed.players[0], "1", "registered"],
    [seed.tournament.name, seed.event.name, seed.players[1], "2", "registered"]
  ]));
  writeFileSync(join(importDir, "matches.csv"), toCsv([
    ["赛事", "比赛项目", "轮次", "选手 A", "选手 B", "比分 A", "比分 B"],
    [seed.tournament.name, seed.event.name, "1", seed.players[0], seed.players[1], "5", "3"]
  ]));

  return importDir;
}

function writeImportWorkbook(seed) {
  const importDir = mkdtempSync(join(tmpdir(), "heima-ratings-import-"));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["name", "club"],
    [seed.players[0], "验收剑馆"],
    [seed.players[1], "验收剑馆"]
  ]), "players");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["tournament_name", "event_name", "player_name", "seed", "status"],
    [seed.tournament.name, seed.event.name, seed.players[0], 1, "registered"],
    [seed.tournament.name, seed.event.name, seed.players[1], 2, "registered"]
  ]), "event_entries");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["赛事", "比赛项目", "轮次", "选手 A", "选手 B", "比分 A", "比分 B"],
    [seed.tournament.name, seed.event.name, 1, seed.players[0], seed.players[1], 5, 3]
  ]), "matches");
  const filePath = join(importDir, "matches-import.xlsx");
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

async function verifyImportedData(supabase, seed) {
  const players = await queryMany(
    supabase
      .from("players")
      .select("id,name,club")
      .eq("organization_id", seed.organization.id)
      .in("name", seed.players),
    "verify imported players"
  );
  assert(players.length === 2, `expected 2 imported players, got ${players.length}`);
  const entries = await queryMany(
    supabase
      .from("tournament_event_entries")
      .select("id,event_id,player_id,seed,status")
      .eq("event_id", seed.event.id)
      .in("player_id", players.map((player) => player.id)),
    "verify imported entries"
  );
  assert(entries.length === 2, `expected 2 imported entries, got ${entries.length}`);
  assert(entries.every((entry) => entry.status === "registered"), "imported entries should be registered");
  const matches = await queryMany(
    supabase
      .from("matches")
      .select("id,event_id,player1_id,player2_id,score1,score2")
      .eq("event_id", seed.event.id),
    "verify imported matches"
  );
  assert(matches.length === 1, `expected 1 imported match, got ${matches.length}`);
  const ratings = await queryMany(
    supabase
      .from("player_weapon_ratings")
      .select("id,player_id,weapon_type_id,current_rating,matches_count,wins_count,losses_count")
      .in("player_id", players.map((player) => player.id))
      .eq("weapon_type_id", seed.weapon.id),
    "verify recalculated ratings"
  );
  assert(ratings.length === 2, `expected 2 recalculated ratings, got ${ratings.length}`);
  assert(ratings.every((rating) => rating.matches_count === 1), "recalculated ratings should include imported match");
  assert(
    ratings.some((rating) => Number(rating.current_rating) > 1500) &&
      ratings.some((rating) => Number(rating.current_rating) < 1500),
    "ratings should change after imported match"
  );

  console.log("data import apply verification: ok");
}

async function cleanupSeedData(supabase, created) {
  if (!created.organizationId) {
    return;
  }

  await expectMutation(
    supabase.from("tournaments").delete().eq("organization_id", created.organizationId),
    "cleanup tournaments"
  );
  await expectMutation(
    supabase.from("players").delete().eq("organization_id", created.organizationId),
    "cleanup players"
  );
  await expectMutation(
    supabase.from("weapon_types").delete().eq("organization_id", created.organizationId),
    "cleanup weapons"
  );
  await expectMutation(
    supabase.from("organizations").delete().eq("id", created.organizationId),
    "cleanup organization"
  );
  console.log("data import cleanup: ok");
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const text = String(cell ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  }).join(",")).join("\n");
}

function readConfig() {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} failed with exit code ${code}`));
        return;
      }
      resolve();
    });
  });
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
