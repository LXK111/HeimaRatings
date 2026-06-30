import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

async function main() {
  console.log("HEMA Ratings management Auth/API E2E verify");
  const config = readConfig();

  await expectJsonStatus(config, "/api/public/rankings/demo", 200, "anonymous public rankings");
  await expectJsonStatus(config, "/api/weapons", 401, "anonymous management API");

  const viewerSession = await signInWithSsrCookies("viewer", config.viewerCredentials, config);
  await expectJsonStatus(config, "/api/weapons", 200, "viewer management read", viewerSession);
  await expectJsonStatus(
    config,
    "/api/rankings/calculate",
    403,
    "viewer management write",
    viewerSession,
    rankingWriteRequest()
  );

  const editorSession = await signInWithSsrCookies("editor", config.editorCredentials, config);
  await expectJsonStatus(config, "/api/weapons", 200, "editor management read", editorSession);
  const editorWritePayload = await expectJsonStatus(
    config,
    "/api/rankings/calculate",
    200,
    "editor management write",
    editorSession,
    rankingWriteRequest()
  );

  if (!editorWritePayload.data?.snapshot?.id) {
    throw new Error("editor management write did not return snapshot.id");
  }

  console.log("Management Auth/API E2E verify passed.");
}

function readConfig() {
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required."
    );
  }

  return {
    baseUrl:
      process.env.HEIMA_RATINGS_API_VERIFY_BASE_URL ??
      process.env.HEIMA_RATINGS_BASE_URL ??
      "http://localhost:3000",
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseKey,
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
    cookieHeader: Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ")
  };
}

async function expectJsonStatus(config, path, expectedStatus, label, session, init = {}) {
  let response;
  const url = new URL(path, config.baseUrl);
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(session ? { Cookie: session.cookieHeader } : {})
      },
      redirect: "manual"
    });
  } catch (error) {
    throw new Error(
      `${label} request failed for ${url}. Is the local Next.js server running? ${error}`
    );
  }
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

function rankingWriteRequest() {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: "hybrid",
      weaponTypeId: "weapon-longsword",
      tournamentId: "demo",
      persistSnapshot: true
    })
  };
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
