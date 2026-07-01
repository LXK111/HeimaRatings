import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const verifyPort = process.env.HEIMA_RATINGS_BRACKET_SLOTS_ADVANCE_VERIFY_PORT ?? "3800";
const baseUrl =
  process.env.HEIMA_RATINGS_BRACKET_SLOTS_ADVANCE_VERIFY_BASE_URL ??
  `http://localhost:${verifyPort}`;

async function main() {
  console.log("HEMA Ratings Supabase bracket slots advancement verify");
  const config = readConfig();
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const viewerSession = await signInWithSsrCookies("viewer", config.viewerCredentials, config);
  const editorSession = await signInWithSsrCookies("editor", config.editorCredentials, config);
  const created = {
    organizationId: undefined,
    tournamentId: undefined,
    eventId: undefined,
    organizationSlug: `stage53-${randomUUID().slice(0, 8)}`
  };

  try {
    await cleanupStaleStage53Data(supabase);
    const seed = await seedBracketSlotsData(supabase, created, viewerSession.userId, editorSession.userId);
    await runCommand("npm", ["run", "build"], {
      env: {
        ...process.env,
        HEIMA_RATINGS_DATA_SOURCE: "supabase",
        HEIMA_RATINGS_AUTH_REQUIRED: "true"
      }
    });

    const server = spawn("npm", ["run", "start"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HEIMA_RATINGS_DATA_SOURCE: "supabase",
        HEIMA_RATINGS_AUTH_REQUIRED: "true",
        PORT: verifyPort
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let serverStopped = false;
    const stopServer = () => {
      if (!serverStopped && !server.killed) {
        serverStopped = true;
        server.kill("SIGTERM");
      }
    };

    process.once("SIGINT", () => {
      stopServer();
      process.exit(130);
    });
    process.once("SIGTERM", () => {
      stopServer();
      process.exit(143);
    });

    server.stdout.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));

    try {
      await waitForServer(baseUrl);
      await expectBracketAction(seed, editorSession, "generate", 200, "editor initial bracket generation");
      const firstRoundMatch = await completeFirstRoundMatch(supabase, seed);
      await expectBracketAction(seed, viewerSession, "advance", 403, "viewer bracket advancement denied");
      const advancePayload = await expectBracketAction(seed, editorSession, "advance", 200, "editor bracket advancement");
      assert(Array.isArray(advancePayload.data) && advancePayload.data.length === 1, "advancement should create 1 real match");
      await verifyAdvancedSlots(supabase, seed, firstRoundMatch.id);
    } finally {
      stopServer();
    }
  } finally {
    await cleanupSeedData(supabase, created);
  }

  console.log("Supabase bracket slots advancement verify passed.");
}

async function seedBracketSlotsData(supabase, created, viewerUserId, editorUserId) {
  const organization = await querySingle(
    supabase
      .from("organizations")
      .insert({
        name: "Stage 53 签位晋级验收组织",
        slug: created.organizationSlug
      })
      .select("id,slug")
      .single(),
    "seed organization"
  );
  created.organizationId = organization.id;

  await queryMany(
    supabase
      .from("organization_members")
      .insert([
        { organization_id: organization.id, user_id: viewerUserId, role: "viewer" },
        { organization_id: organization.id, user_id: editorUserId, role: "editor" }
      ])
      .select("id"),
    "seed memberships"
  );

  const weapon = await querySingle(
    supabase
      .from("weapon_types")
      .insert({
        organization_id: organization.id,
        name: "阶段53长剑",
        slug: "stage53-longsword",
        enabled: true,
        sort_order: 1
      })
      .select("id")
      .single(),
    "seed weapon"
  );
  const players = await queryMany(
    supabase
      .from("players")
      .insert([
        { organization_id: organization.id, name: "阶段53林澈", club: "验收会" },
        { organization_id: organization.id, name: "阶段53周衡", club: "验收会" },
        { organization_id: organization.id, name: "阶段53许岚", club: "验收会" }
      ])
      .select("id,name"),
    "seed players"
  );
  const lin = findByName(players, "阶段53林澈");
  const zhou = findByName(players, "阶段53周衡");
  const xu = findByName(players, "阶段53许岚");
  const tournament = await querySingle(
    supabase
      .from("tournaments")
      .insert({
        organization_id: organization.id,
        name: "Stage 53 签位晋级验收赛",
        format: "single_elimination",
        status: "active",
        default_algorithm: "hybrid"
      })
      .select("id")
      .single(),
    "seed tournament"
  );
  created.tournamentId = tournament.id;

  const event = await querySingle(
    supabase
      .from("tournament_events")
      .insert({
        tournament_id: tournament.id,
        weapon_type_id: weapon.id,
        name: "阶段53长剑公开组",
        format: "single_elimination",
        status: "active"
      })
      .select("id")
      .single(),
    "seed event"
  );
  created.eventId = event.id;

  await queryMany(
    supabase
      .from("tournament_event_entries")
      .insert([
        { event_id: event.id, player_id: lin.id, seed: 1, status: "registered" },
        { event_id: event.id, player_id: zhou.id, seed: 2, status: "registered" },
        { event_id: event.id, player_id: xu.id, seed: 3, status: "registered" }
      ])
      .select("id"),
    "seed entries"
  );

  console.log("supabase bracket advancement seed: ok");
  return {
    organizationSlug: organization.slug,
    tournamentId: tournament.id,
    eventId: event.id,
    playerIds: {
      lin: lin.id,
      zhou: zhou.id,
      xu: xu.id
    }
  };
}

async function completeFirstRoundMatch(supabase, seed) {
  const firstRoundMatch = await querySingle(
    supabase
      .from("matches")
      .select("id,player1_id,player2_id")
      .eq("event_id", seed.eventId)
      .eq("round", 1)
      .single(),
    "load first round match"
  );
  assert(firstRoundMatch.player1_id === seed.playerIds.lin, "seed 1 player should be player1");
  assert(firstRoundMatch.player2_id === seed.playerIds.xu, "seed 3 player should be player2");

  await expectMutation(
    supabase
      .from("matches")
      .update({
        score1: 5,
        score2: 3,
        winner_id: seed.playerIds.lin,
        played_at: new Date().toISOString()
      })
      .eq("id", firstRoundMatch.id),
    "complete first round match"
  );

  console.log("supabase bracket first round completion: ok");
  return firstRoundMatch;
}

async function verifyAdvancedSlots(supabase, seed, sourceMatchId) {
  const secondRoundSlots = await queryMany(
    supabase
      .from("bracket_slots")
      .select("id,event_id,round,slot_index,player_id,source_match_id,status")
      .eq("event_id", seed.eventId)
      .eq("round", 2)
      .order("slot_index", { ascending: true }),
    "verify second round slots"
  );
  assert(secondRoundSlots.length === 2, `expected 2 second-round slots, got ${secondRoundSlots.length}`);
  assert(
    secondRoundSlots.some(
      (slot) =>
        slot.player_id === seed.playerIds.lin &&
        slot.source_match_id === sourceMatchId &&
        slot.status === "advanced"
    ),
    "match winner should be recorded as an advanced slot with source_match_id"
  );
  assert(
    secondRoundSlots.some(
      (slot) =>
        slot.player_id === seed.playerIds.zhou &&
        slot.source_match_id === null &&
        slot.status === "occupied"
    ),
    "pending bye player should occupy the other second-round slot without source match"
  );

  const secondRoundMatches = await queryMany(
    supabase
      .from("matches")
      .select("id,event_id,round,player1_id,player2_id")
      .eq("event_id", seed.eventId)
      .eq("round", 2),
    "verify second round matches"
  );
  assert(secondRoundMatches.length === 1, `expected 1 second-round match, got ${secondRoundMatches.length}`);
  assert(
    secondRoundMatches.some(
      (match) =>
        [match.player1_id, match.player2_id].includes(seed.playerIds.lin) &&
        [match.player1_id, match.player2_id].includes(seed.playerIds.zhou)
    ),
    "second-round real match should pair first-round winner with pending bye player"
  );

  console.log("supabase bracket slots advancement: ok");
}

async function expectBracketAction(seed, session, action, expectedStatus, label) {
  const response = await fetch(
    new URL(`/api/tournaments/${seed.tournamentId}/events/${seed.eventId}/bracket/${action}`, baseUrl),
    {
      method: "POST",
      headers: {
        Cookie: session.cookieHeader,
        "x-heima-organization-slug": seed.organizationSlug
      },
      redirect: "manual"
    }
  );
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    throw new Error(`${label} did not return JSON: ${text}`);
  }
  if (response.status !== expectedStatus) {
    throw new Error(`${label} expected HTTP ${expectedStatus}, got ${response.status}: ${text}`);
  }

  console.log(`${label}: ${response.status}`);
  return payload;
}

async function signInWithSsrCookies(label, credentials, config) {
  const cookies = new Map();
  const client = createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookies: {
      getAll() {
        return Array.from(cookies.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          if (value) {
            cookies.set(name, value);
          } else {
            cookies.delete(name);
          }
        }
      }
    }
  });

  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.user) {
    throw new Error(`${label} SSR sign in failed: ${error?.message ?? "missing user"}`);
  }
  if (cookies.size === 0) {
    throw new Error(`${label} SSR sign in did not set auth cookies`);
  }

  console.log(`${label} SSR auth cookies: ok`);
  return {
    userId: data.user.id,
    cookieHeader: Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ")
  };
}

async function waitForServer(url) {
  const timeoutMs = 30000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(new URL("/api/weapons", url));
      if (response.status === 401 || response.ok) {
        return;
      }
    } catch {
      // The production server is still booting.
    }

    await sleep(1000);
  }

  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function cleanupSeedData(supabase, created) {
  if (!created.organizationId) {
    return;
  }

  await deleteOrganizationTree(supabase, created.organizationId, "cleanup current organization");
  console.log("supabase bracket advancement cleanup: ok");
}

async function cleanupStaleStage53Data(supabase) {
  const staleOrganizations = await queryMany(
    supabase
      .from("organizations")
      .select("id,slug")
      .like("slug", "stage53-%"),
    "load stale stage53 organizations"
  );
  for (const organization of staleOrganizations) {
    await deleteOrganizationTree(supabase, organization.id, `cleanup stale organization ${organization.slug}`);
  }

  if (staleOrganizations.length > 0) {
    console.log(`supabase bracket advancement stale cleanup: ${staleOrganizations.length}`);
  }
}

async function deleteOrganizationTree(supabase, organizationId, label) {
  const tournaments = await queryMany(
    supabase.from("tournaments").select("id").eq("organization_id", organizationId),
    `${label}.tournaments`
  );
  if (tournaments.length > 0) {
    await expectMutation(
      supabase.from("tournaments").delete().in("id", tournaments.map((tournament) => tournament.id)),
      `${label}.delete tournaments`
    );
  }

  await expectMutation(
    supabase.from("players").delete().eq("organization_id", organizationId),
    `${label}.delete players`
  );
  await expectMutation(
    supabase.from("weapon_types").delete().eq("organization_id", organizationId),
    `${label}.delete weapons`
  );
  await expectMutation(
    supabase.from("organization_members").delete().eq("organization_id", organizationId),
    `${label}.delete memberships`
  );
  await expectMutation(
    supabase.from("organizations").delete().eq("id", organizationId),
    `${label}.delete organization`
  );
}

function readConfig() {
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
  }

  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseKey,
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    viewerCredentials: {
      email: requireEnv("HEIMA_RATINGS_RLS_VIEWER_EMAIL"),
      password: requireEnv("HEIMA_RATINGS_RLS_VIEWER_PASSWORD")
    },
    editorCredentials: {
      email: requireEnv("HEIMA_RATINGS_RLS_EDITOR_EMAIL"),
      password: requireEnv("HEIMA_RATINGS_RLS_EDITOR_PASSWORD")
    }
  };
}

function findByName(rows, name) {
  const row = rows.find((item) => item.name === name);
  if (!row) {
    throw new Error(`row not found for name ${name}`);
  }

  return row;
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

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
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
  if (separatorIndex <= 0) {
    return undefined;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return undefined;
  }

  return {
    key,
    value: unquoteEnvValue(rawValue)
  };
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
