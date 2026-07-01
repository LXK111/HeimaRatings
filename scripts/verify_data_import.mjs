import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
  const created = {
    organizationId: undefined,
    organizationSlug: `stage58-${randomUUID().slice(0, 8)}`
  };

  try {
    const seed = await seedImportTarget(supabase, created);
    const importDir = writeImportCsvFiles(seed);
    await runCommand("npm", [
      "run",
      "data:import",
      "--",
      "--dir",
      importDir,
      "--organization-slug",
      created.organizationSlug,
      "--apply"
    ]);
    await verifyImportedData(supabase, seed);
  } finally {
    await cleanupSeedData(supabase, created);
  }

  console.log("Data import verify passed.");
}

async function seedImportTarget(supabase, created) {
  const organization = await querySingle(
    supabase
      .from("organizations")
      .insert({ name: "Stage 58 数据导入验收组织", slug: created.organizationSlug })
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
        name: "阶段58长剑",
        slug: "stage58-longsword",
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
        name: "Stage 58 数据导入验收赛",
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
        name: "阶段58长剑公开组",
        format: "single_elimination",
        status: "active"
      })
      .select("id,name")
      .single(),
    "seed event"
  );

  console.log("data import target seed: ok");
  return { organization, weapon, tournament, event };
}

function writeImportCsvFiles(seed) {
  const importDir = mkdtempSync(join(tmpdir(), "heima-ratings-import-"));
  writeFileSync(join(importDir, "players.csv"), [
    "name,club",
    "阶段58沈砺,验收剑馆",
    "阶段58韩越,验收剑馆"
  ].join("\n"));
  writeFileSync(join(importDir, "ratings.csv"), [
    "player_name,weapon_slug,initial_rating,current_rating,rd,sigma,matches_count,wins_count,losses_count,draws_count",
    `阶段58沈砺,${seed.weapon.slug},1500,1510,340,0.2,1,1,0,0`,
    `阶段58韩越,${seed.weapon.slug},1500,1490,340,0.2,1,0,1,0`
  ].join("\n"));
  writeFileSync(join(importDir, "event_entries.csv"), [
    "tournament_name,event_name,player_name,seed,status",
    `${seed.tournament.name},${seed.event.name},阶段58沈砺,1,registered`,
    `${seed.tournament.name},${seed.event.name},阶段58韩越,2,registered`
  ].join("\n"));

  return importDir;
}

async function verifyImportedData(supabase, seed) {
  const players = await queryMany(
    supabase
      .from("players")
      .select("id,name,club")
      .eq("organization_id", seed.organization.id)
      .in("name", ["阶段58沈砺", "阶段58韩越"]),
    "verify imported players"
  );
  assert(players.length === 2, `expected 2 imported players, got ${players.length}`);
  const ratings = await queryMany(
    supabase
      .from("player_weapon_ratings")
      .select("id,player_id,weapon_type_id,current_rating")
      .in("player_id", players.map((player) => player.id))
      .eq("weapon_type_id", seed.weapon.id),
    "verify imported ratings"
  );
  assert(ratings.length === 2, `expected 2 imported ratings, got ${ratings.length}`);
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
