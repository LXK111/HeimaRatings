import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const verifyPort = process.env.HEIMA_RATINGS_BRACKET_SLOTS_VERIFY_PORT ?? "3700";
const baseUrl =
  process.env.HEIMA_RATINGS_BRACKET_SLOTS_VERIFY_BASE_URL ?? `http://localhost:${verifyPort}`;

async function main() {
  console.log("HEMA Ratings Supabase bracket slots generation verify");
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
    organizationSlug: `stage52-${randomUUID().slice(0, 8)}`
  };

  try {
    await cleanupStaleStage52Data(supabase);
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
      await expectJsonStatus(seed, viewerSession, 403, "viewer bracket slot generation denied");
      const payload = await expectJsonStatus(seed, editorSession, 200, "editor bracket slot generation");
      assert(Array.isArray(payload.data) && payload.data.length === 1, "editor generation should create 1 real match");
      await verifyGeneratedSlots(supabase, seed);
    } finally {
      stopServer();
    }
  } finally {
    await cleanupSeedData(supabase, created);
  }

  console.log("Supabase bracket slots generation verify passed.");
}

async function seedBracketSlotsData(supabase, created, viewerUserId, editorUserId) {
  const organization = await querySingle(
    supabase
      .from("organizations")
      .insert({
        name: "Stage 52 签位生成验收组织",
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
        name: "阶段52长剑",
        slug: "stage52-longsword",
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
        { organization_id: organization.id, name: "阶段52林澈", club: "验收会" },
        { organization_id: organization.id, name: "阶段52周衡", club: "验收会" },
        { organization_id: organization.id, name: "阶段52许岚", club: "验收会" }
      ])
      .select("id,name"),
    "seed players"
  );
  const lin = findByName(players, "阶段52林澈");
  const zhou = findByName(players, "阶段52周衡");
  const xu = findByName(players, "阶段52许岚");
  const tournament = await querySingle(
    supabase
      .from("tournaments")
      .insert({
        organization_id: organization.id,
        name: "Stage 52 签位生成验收赛",
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
        name: "阶段52长剑公开组",
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

  console.log("supabase bracket slots seed: ok");
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

async function verifyGeneratedSlots(supabase, seed) {
  const slots = await queryMany(
    supabase
      .from("bracket_slots")
      .select("id,event_id,round,slot_index,player_id,status")
      .eq("event_id", seed.eventId)
      .order("slot_index", { ascending: true }),
    "verify bracket slots"
  );
  assert(slots.length === 3, `expected 3 bracket slots, got ${slots.length}`);
  assert(slots.filter((slot) => slot.status === "occupied").length === 2, "expected 2 occupied slots");
  assert(slots.filter((slot) => slot.status === "bye").length === 1, "expected 1 bye slot");
  assert(slots.every((slot) => slot.round === 1), "all generated slots should be first-round slots");

  const byeSlot = slots.find((slot) => slot.status === "bye");
  assert(byeSlot?.player_id === seed.playerIds.zhou, "seed 2 player should be recorded as the bye slot");

  const matches = await queryMany(
    supabase
      .from("matches")
      .select("id,event_id,round,player1_id,player2_id")
      .eq("event_id", seed.eventId),
    "verify generated matches"
  );
  assert(matches.length === 1, `expected 1 real match, got ${matches.length}`);
  assert(
    matches.every((match) => match.player1_id !== seed.playerIds.zhou && match.player2_id !== seed.playerIds.zhou),
    "bye player should not appear in a virtual match"
  );

  console.log("supabase bracket slots generation: ok");
}

async function expectJsonStatus(seed, session, expectedStatus, label) {
  const response = await fetch(
    new URL(`/api/tournaments/${seed.tournamentId}/events/${seed.eventId}/bracket/generate`, baseUrl),
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
  console.log("supabase bracket slots cleanup: ok");
}

async function cleanupStaleStage52Data(supabase) {
  const staleOrganizations = await queryMany(
    supabase
      .from("organizations")
      .select("id,slug")
      .like("slug", "stage52-%"),
    "load stale stage52 organizations"
  );
  for (const organization of staleOrganizations) {
    await deleteOrganizationTree(supabase, organization.id, `cleanup stale organization ${organization.slug}`);
  }

  if (staleOrganizations.length > 0) {
    console.log(`supabase bracket slots stale cleanup: ${staleOrganizations.length}`);
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
