import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const verifyPort = process.env.HEIMA_RATINGS_SUPABASE_RANKING_INPUT_VERIFY_PORT ?? "3600";
const baseUrl =
  process.env.HEIMA_RATINGS_SUPABASE_RANKING_INPUT_VERIFY_BASE_URL ??
  `http://localhost:${verifyPort}`;

async function main() {
  console.log("HEMA Ratings Supabase Ranking input construction verify");
  const config = readConfig();
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const editorSession = await signInWithSsrCookies("editor", config.editorCredentials, config);
  const created = {
    organizationId: undefined,
    tournamentId: undefined,
    longswordWeaponId: undefined,
    sabreWeaponId: undefined,
    longswordEventId: undefined,
    sabreEventId: undefined,
    organizationSlug: `stage50-${randomUUID().slice(0, 8)}`
  };

  try {
    await cleanupStaleStage50Data(supabase);
    const seed = await seedRankingInputData(supabase, created, editorSession.userId);
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
      await verifyLongswordEventInput(seed, editorSession);
      await verifySabreEventIsolation(seed, editorSession);
    } finally {
      stopServer();
    }
  } finally {
    await cleanupSeedData(supabase, created);
  }

  console.log("Supabase Ranking input construction verify passed.");
}

async function seedRankingInputData(supabase, created, editorUserId) {
  const organization = await querySingle(
    supabase
      .from("organizations")
      .insert({
        name: "Stage 50 Ranking 输入验收组织",
        slug: created.organizationSlug
      })
      .select("id,slug")
      .single(),
    "seed organization"
  );
  created.organizationId = organization.id;

  await querySingle(
    supabase
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: editorUserId,
        role: "editor"
      })
      .select("id")
      .single(),
    "seed editor membership"
  );

  const weapons = await queryMany(
    supabase
      .from("weapon_types")
      .insert([
        {
          organization_id: organization.id,
          name: "阶段50长剑",
          slug: "stage50-longsword",
          enabled: true,
          sort_order: 1
        },
        {
          organization_id: organization.id,
          name: "阶段50军刀",
          slug: "stage50-sabre",
          enabled: true,
          sort_order: 2
        }
      ])
      .select("id,slug"),
    "seed weapons"
  );
  const longswordWeapon = findBySlug(weapons, "stage50-longsword");
  const sabreWeapon = findBySlug(weapons, "stage50-sabre");
  created.longswordWeaponId = longswordWeapon.id;
  created.sabreWeaponId = sabreWeapon.id;

  const players = await queryMany(
    supabase
      .from("players")
      .insert([
        { organization_id: organization.id, name: "阶段50林澈", club: "验收会" },
        { organization_id: organization.id, name: "阶段50周衡", club: "验收会" },
        { organization_id: organization.id, name: "阶段50许岚", club: "验收会" },
        { organization_id: organization.id, name: "阶段50沈砚", club: "验收会" }
      ])
      .select("id,name"),
    "seed players"
  );
  const lin = findByName(players, "阶段50林澈");
  const zhou = findByName(players, "阶段50周衡");
  const xu = findByName(players, "阶段50许岚");
  const shen = findByName(players, "阶段50沈砚");

  await queryMany(
    supabase
      .from("player_weapon_ratings")
      .insert([
        ratingRow(lin.id, longswordWeapon.id, 1600),
        ratingRow(zhou.id, longswordWeapon.id, 1500),
        ratingRow(xu.id, longswordWeapon.id, 1480),
        ratingRow(xu.id, sabreWeapon.id, 1540),
        ratingRow(shen.id, sabreWeapon.id, 1510)
      ])
      .select("id"),
    "seed player weapon ratings"
  );

  const tournament = await querySingle(
    supabase
      .from("tournaments")
      .insert({
        organization_id: organization.id,
        name: "Stage 50 Ranking 输入构造验收赛",
        format: "single_elimination",
        status: "active",
        default_algorithm: "hybrid"
      })
      .select("id")
      .single(),
    "seed tournament"
  );
  created.tournamentId = tournament.id;

  const events = await queryMany(
    supabase
      .from("tournament_events")
      .insert([
        {
          tournament_id: tournament.id,
          weapon_type_id: longswordWeapon.id,
          name: "阶段50长剑公开组",
          format: "single_elimination",
          status: "active"
        },
        {
          tournament_id: tournament.id,
          weapon_type_id: sabreWeapon.id,
          name: "阶段50军刀公开组",
          format: "single_elimination",
          status: "active"
        }
      ])
      .select("id,name"),
    "seed tournament events"
  );
  const longswordEvent = findByName(events, "阶段50长剑公开组");
  const sabreEvent = findByName(events, "阶段50军刀公开组");
  created.longswordEventId = longswordEvent.id;
  created.sabreEventId = sabreEvent.id;

  await queryMany(
    supabase
      .from("tournament_event_entries")
      .insert([
        entryRow(longswordEvent.id, lin.id, 1),
        entryRow(longswordEvent.id, zhou.id, 2),
        entryRow(longswordEvent.id, xu.id, 3),
        entryRow(sabreEvent.id, xu.id, 1),
        entryRow(sabreEvent.id, shen.id, 2)
      ])
      .select("id"),
    "seed event entries"
  );

  await queryMany(
    supabase
      .from("matches")
      .insert([
        // 许岚在长剑首轮轮空，真库只写入实际发生的两场比赛。
        matchRow(tournament.id, longswordEvent.id, longswordWeapon.id, 1, lin.id, zhou.id, 5, 3, lin.id),
        matchRow(tournament.id, longswordEvent.id, longswordWeapon.id, 2, lin.id, xu.id, 5, 2, lin.id),
        matchRow(tournament.id, sabreEvent.id, sabreWeapon.id, 1, xu.id, shen.id, 5, 4, xu.id)
      ])
      .select("id"),
    "seed matches"
  );

  console.log("supabase ranking input seed: ok");
  return {
    organizationSlug: organization.slug,
    tournamentId: tournament.id,
    longswordWeaponId: longswordWeapon.id,
    sabreWeaponId: sabreWeapon.id,
    longswordEventId: longswordEvent.id,
    sabreEventId: sabreEvent.id,
    players: {
      lin: lin.name,
      zhou: zhou.name,
      xu: xu.name,
      shen: shen.name
    }
  };
}

async function verifyLongswordEventInput(seed, session) {
  const ranking = await calculateRanking(seed, session, {
    algorithm: "hybrid",
    tournamentId: seed.tournamentId,
    weaponTypeId: seed.longswordWeaponId,
    eventId: seed.longswordEventId
  });

  assert(ranking.algorithm === "hybrid", "longsword event ranking algorithm should be hybrid");
  assertTotalMatchCount(ranking.rankings, 2, "supabase longsword event");
  assertRankingStats(ranking, seed.players.lin, { matches: 2, wins: 2, losses: 0 });
  assertRankingStats(ranking, seed.players.zhou, { matches: 1, wins: 0, losses: 1 });
  assertRankingStats(ranking, seed.players.xu, { matches: 1, wins: 0, losses: 1 });

  console.log("supabase longsword event input construction: ok");
}

async function verifySabreEventIsolation(seed, session) {
  const ranking = await calculateRanking(seed, session, {
    algorithm: "hybrid",
    tournamentId: seed.tournamentId,
    weaponTypeId: seed.sabreWeaponId,
    eventId: seed.sabreEventId
  });

  assertTotalMatchCount(ranking.rankings, 1, "supabase sabre event");
  assertRankingStats(ranking, seed.players.xu, { matches: 1, wins: 1, losses: 0 });
  assertRankingStats(ranking, seed.players.shen, { matches: 1, wins: 0, losses: 1 });
  assert(
    !ranking.rankings.some((row) => row.name === seed.players.zhou),
    "sabre event ranking should not include a longsword-only player"
  );

  console.log("supabase sabre event isolation: ok");
}

async function calculateRanking(seed, session, body) {
  return getJson("/api/rankings/calculate", "ranking calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookieHeader,
      "x-heima-organization-slug": seed.organizationSlug
    },
    body: JSON.stringify(body)
  });
}

async function getJson(path, label, init) {
  const response = await fetch(new URL(path, baseUrl), init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}: ${text}`);
  }
  const payload = JSON.parse(text);
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error(`${label} payload should contain data`);
  }

  return payload.data;
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
  console.log("supabase ranking input cleanup: ok");
}

async function cleanupStaleStage50Data(supabase) {
  const staleOrganizations = await queryMany(
    supabase
      .from("organizations")
      .select("id,slug")
      .like("slug", "stage50-%"),
    "load stale stage50 organizations"
  );
  for (const organization of staleOrganizations) {
    await deleteOrganizationTree(supabase, organization.id, `cleanup stale organization ${organization.slug}`);
  }

  if (staleOrganizations.length > 0) {
    console.log(`supabase ranking input stale cleanup: ${staleOrganizations.length}`);
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
    editorCredentials: {
      email: requireEnv("HEIMA_RATINGS_RLS_EDITOR_EMAIL"),
      password: requireEnv("HEIMA_RATINGS_RLS_EDITOR_PASSWORD")
    }
  };
}

function ratingRow(playerId, weaponTypeId, rating) {
  return {
    player_id: playerId,
    weapon_type_id: weaponTypeId,
    initial_rating: rating,
    current_rating: rating,
    rd: 350,
    sigma: 0.2,
    matches_count: 0,
    wins_count: 0,
    losses_count: 0,
    draws_count: 0
  };
}

function entryRow(eventId, playerId, seed) {
  return {
    event_id: eventId,
    player_id: playerId,
    seed,
    status: "registered"
  };
}

function matchRow(tournamentId, eventId, weaponTypeId, round, player1Id, player2Id, score1, score2, winnerId) {
  return {
    tournament_id: tournamentId,
    event_id: eventId,
    weapon_type_id: weaponTypeId,
    round,
    player1_id: player1Id,
    player2_id: player2Id,
    score1,
    score2,
    winner_id: winnerId,
    played_at: new Date().toISOString()
  };
}

function assertRankingStats(output, name, expected) {
  const row = output.rankings.find((item) => item.name === name);
  assert(row, `ranking row not found for ${name}`);
  assert(row.matches === expected.matches, `${name} matches should be ${expected.matches}, got ${row.matches}`);
  assert(row.wins === expected.wins, `${name} wins should be ${expected.wins}, got ${row.wins}`);
  assert(row.losses === expected.losses, `${name} losses should be ${expected.losses}, got ${row.losses}`);
}

function assertTotalMatchCount(rows, realMatchCount, label) {
  const totalMatches = rows.reduce((sum, row) => sum + row.matches, 0);
  assert(
    totalMatches === realMatchCount * 2,
    `${label} should count exactly ${realMatchCount} real matches, got participant total ${totalMatches}`
  );
}

function findBySlug(rows, slug) {
  const row = rows.find((item) => item.slug === slug);
  if (!row) {
    throw new Error(`row not found for slug ${slug}`);
  }

  return row;
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
