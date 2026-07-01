import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const verifyPort = process.env.HEIMA_RATINGS_PUBLIC_VERIFY_PORT ?? "3400";
const baseUrl = process.env.HEIMA_RATINGS_PUBLIC_VERIFY_BASE_URL ?? `http://localhost:${verifyPort}`;
const chromeExecutablePath =
  process.env.HEIMA_RATINGS_BROWSER_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const requiredWeapons = [
  { slug: "longsword", fallbackId: "weapon-longsword" },
  { slug: "sabre", fallbackId: "weapon-sabre" },
  { slug: "rapier", fallbackId: "weapon-rapier" }
];

async function main() {
  console.log("HEMA Ratings public multi-weapon Supabase verify");
  const config = readConfig();
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const created = {
    pageId: `stage45-${randomUUID().slice(0, 8)}`,
    publicPageUuid: undefined,
    snapshotIds: []
  };

  try {
    const seed = await seedPublicMultiWeaponPage(supabase, config, created);

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
      await verifyPublicApi(baseUrl, created.pageId, seed.weaponNames);
      await verifyPublicPage(baseUrl, created.pageId, seed.weaponNames);
    } finally {
      stopServer();
    }
  } finally {
    await cleanupSeedData(supabase, created);
  }

  console.log("Public multi-weapon Supabase verify passed.");
}

function readConfig() {
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.");
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    organizationSlug: process.env.HEIMA_RATINGS_RLS_ORGANIZATION_SLUG ?? "hema-ratings-demo"
  };
}

async function seedPublicMultiWeaponPage(supabase, config, created) {
  const organization = await querySingle(
    supabase.from("organizations").select("id,slug").eq("slug", config.organizationSlug).maybeSingle(),
    `organization ${config.organizationSlug}`
  );
  const tournament = await querySingle(
    supabase
      .from("tournaments")
      .select("id,name")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    "seed tournament"
  );
  const weapons = await loadRequiredWeapons(supabase, organization.id);
  const players = await queryMany(
    supabase
      .from("players")
      .select("id,name")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true })
      .limit(2),
    "seed players"
  );
  if (players.length < 2) {
    throw new Error("public multi-weapon verify requires at least 2 players in the organization");
  }

  const publicPage = await querySingle(
    supabase
      .from("public_pages")
      .insert({
        organization_id: organization.id,
        page_id: created.pageId,
        tournament_id: tournament.id,
        default_weapon_type_id: weapons[0].id,
        title: "Stage 45 多武器公开榜单验收",
        theme: "dark",
        enabled: true
      })
      .select("id,page_id")
      .single(),
    "seed public page"
  );
  created.publicPageUuid = publicPage.id;

  for (const [index, weapon] of weapons.entries()) {
    const snapshot = await querySingle(
      supabase
        .from("ranking_snapshots")
        .insert({
          tournament_id: tournament.id,
          weapon_type_id: weapon.id,
          algorithm: "hybrid",
          source_hash: `stage45-${created.pageId}-${weapon.slug}`
        })
        .select("id")
        .single(),
      `seed snapshot ${weapon.slug}`
    );
    created.snapshotIds.push(snapshot.id);

    await queryMany(
      supabase
        .from("ranking_snapshot_items")
        .insert([
          {
            snapshot_id: snapshot.id,
            player_id: players[0].id,
            rank: 1,
            rating: 1600 + index * 10,
            matches_count: 2,
            wins_count: 2,
            losses_count: 0,
            draws_count: 0
          },
          {
            snapshot_id: snapshot.id,
            player_id: players[1].id,
            rank: 2,
            rating: 1500 + index * 10,
            matches_count: 2,
            wins_count: 0,
            losses_count: 2,
            draws_count: 0
          }
        ])
        .select("id"),
      `seed snapshot items ${weapon.slug}`
    );

    await querySingle(
      supabase
        .from("public_page_snapshots")
        .upsert({
          public_page_id: publicPage.id,
          weapon_type_id: weapon.id,
          snapshot_id: snapshot.id,
          sort_order: index + 1
        }, { onConflict: "public_page_id,weapon_type_id" })
        .select("id")
        .single(),
      `seed public page snapshot ${weapon.slug}`
    );
  }

  console.log("public multi-weapon seed: ok");
  return {
    weaponNames: weapons.map((weapon) => weapon.name)
  };
}

async function loadRequiredWeapons(supabase, organizationId) {
  const weapons = await queryMany(
    supabase
      .from("weapon_types")
      .select("id,name,slug")
      .eq("organization_id", organizationId)
      .eq("enabled", true),
    "seed weapons"
  );
  const found = requiredWeapons.map((required) =>
    weapons.find((weapon) => weapon.slug === required.slug || weapon.id === required.fallbackId)
  );
  const missing = found
    .map((weapon, index) => (weapon ? undefined : requiredWeapons[index].slug))
    .filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`missing required public ranking weapons: ${missing.join(", ")}`);
  }

  return found;
}

async function verifyPublicApi(url, pageId, weaponNames) {
  const response = await fetch(new URL(`/api/public/rankings/${pageId}`, url));
  if (!response.ok) {
    throw new Error(`public ranking API returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  const data = payload.data;
  if (!data || typeof data !== "object") {
    throw new Error("public ranking API did not return data");
  }
  const populatedWeaponIds = Object.entries(data.rankingsByWeapon ?? {})
    .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
    .map(([weaponId]) => weaponId);
  if (populatedWeaponIds.length < weaponNames.length) {
    throw new Error(
      `public ranking API expected ${weaponNames.length} populated weapons, got ${populatedWeaponIds.length}`
    );
  }

  console.log("public multi-weapon API: ok");
}

async function verifyPublicPage(url, pageId, weaponNames) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(chromeExecutablePath) ? chromeExecutablePath : undefined
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    const response = await page.goto(new URL(`/public/rankings/${pageId}`, url).toString(), {
      waitUntil: "networkidle"
    });
    if (!response || !response.ok()) {
      throw new Error(`public ranking page returned HTTP ${response?.status() ?? "unknown"}`);
    }
    await expectText(page, "武器切换", "public ranking page");
    for (const weaponName of weaponNames) {
      await expectText(page, weaponName, "public ranking weapon switch");
    }
    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors:\n${pageErrors.join("\n")}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors:\n${consoleErrors.join("\n")}`);
    }
  } finally {
    await browser.close();
  }

  console.log("public multi-weapon page: ok");
}

async function cleanupSeedData(supabase, created) {
  if (created.publicPageUuid) {
    const pageDelete = await supabase.from("public_pages").delete().eq("id", created.publicPageUuid);
    if (pageDelete.error) {
      throw new Error(`cleanup public page failed: ${pageDelete.error.message}`);
    }
  }
  if (created.snapshotIds.length > 0) {
    const snapshotDelete = await supabase.from("ranking_snapshots").delete().in("id", created.snapshotIds);
    if (snapshotDelete.error) {
      throw new Error(`cleanup snapshots failed: ${snapshotDelete.error.message}`);
    }
  }
  console.log("public multi-weapon cleanup: ok");
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

async function waitForServer(url) {
  const timeoutMs = 30000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(new URL("/api/public/rankings/not-found", url));
      if (response.status === 404) {
        return;
      }
    } catch {
      // The production server is still booting.
    }

    await sleep(1000);
  }

  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
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

async function expectText(page, text, label) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
    throw new Error(`${label} did not show expected text: ${text}`);
  });
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
  if (value.length >= 2) {
    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value[value.length - 1] === quote) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
