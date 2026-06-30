import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

async function main() {
  console.log("HEMA Ratings Supabase Auth/RLS E2E verify");
  const config = readConfig();

  const anonymous = createSupabaseClient(config);
  await verifyPublicRankingPage(anonymous);

  const viewer = await signIn("viewer", config.viewerCredentials, config);
  const organization = await loadOrganization(viewer, config.organizationSlug);
  await verifyMembership(viewer, organization.id, "viewer");
  await verifyReadAccess(viewer, organization.id, "viewer");
  await verifyViewerCannotWrite(viewer, organization.id);

  const editor = await signIn("editor", config.editorCredentials, config);
  await verifyMembership(editor, organization.id, "editor");
  await verifyReadAccess(editor, organization.id, "editor");
  await verifyEditorCanWrite(editor, organization.id);

  await viewer.auth.signOut();
  await editor.auth.signOut();

  console.log("Supabase Auth/RLS E2E verify passed.");
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
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseKey,
    organizationSlug: process.env.HEIMA_RATINGS_RLS_ORGANIZATION_SLUG ?? "hema-ratings-demo",
    publicPageId: process.env.HEIMA_RATINGS_RLS_PUBLIC_PAGE_ID ?? "demo",
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

function createSupabaseClient(config) {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function signIn(label, credentials, config) {
  const client = createSupabaseClient(config);
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.user) {
    throw new Error(`${label} sign in failed: ${error?.message ?? "missing user"}`);
  }

  console.log(`${label} auth: ok`);
  return client;
}

async function loadOrganization(client, organizationSlug) {
  const { data, error } = await client
    .from("organizations")
    .select("id,slug")
    .eq("slug", organizationSlug)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `organization lookup failed for ${organizationSlug}: ${error?.message ?? "not found"}`
    );
  }

  console.log("member organization lookup: ok");
  return data;
}

async function verifyPublicRankingPage(client) {
  const publicPageId = process.env.HEIMA_RATINGS_RLS_PUBLIC_PAGE_ID ?? "demo";
  const { data, error } = await client
    .from("public_pages")
    .select("id,page_id,enabled")
    .eq("page_id", publicPageId)
    .eq("enabled", true)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `anonymous public page read failed for ${publicPageId}: ${error?.message ?? "not found"}`
    );
  }

  console.log("anonymous public page read: ok");
}

async function verifyMembership(client, organizationId, expectedRole) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new Error(`getUser failed: ${userError?.message ?? "missing user"}`);
  }

  const { data, error } = await client
    .from("organization_members")
    .select("organization_id,role")
    .eq("organization_id", organizationId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`membership read failed: ${error?.message ?? "not found"}`);
  }

  if (data.role !== expectedRole) {
    throw new Error(`membership role should be ${expectedRole}, got ${data.role}`);
  }

  console.log(`${expectedRole} membership read: ok`);
}

async function verifyReadAccess(client, organizationId, label) {
  const { data, error } = await client
    .from("weapon_types")
    .select("id,name")
    .eq("organization_id", organizationId)
    .limit(1);

  if (error) {
    throw new Error(`${label} weapon read failed: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${label} weapon read returned no rows`);
  }

  console.log(`${label} weapon read: ok`);
}

async function verifyViewerCannotWrite(client, organizationId) {
  const slug = `stage25-viewer-blocked-${randomUUID()}`;
  const { data, error } = await client
    .from("weapon_types")
    .insert({
      organization_id: organizationId,
      name: "Stage 25 Viewer Blocked",
      slug,
      enabled: true,
      sort_order: 9999
    })
    .select("id")
    .maybeSingle();

  if (!error || data) {
    throw new Error("viewer unexpectedly inserted weapon_types");
  }

  console.log("viewer write denied: ok");
}

async function verifyEditorCanWrite(client, organizationId) {
  const slug = `stage25-editor-allowed-${randomUUID()}`;
  const insertResult = await client
    .from("weapon_types")
    .insert({
      organization_id: organizationId,
      name: "Stage 25 Editor Allowed",
      slug,
      enabled: true,
      sort_order: 9998
    })
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data) {
    throw new Error(`editor insert failed: ${insertResult.error?.message ?? "missing row"}`);
  }

  const weaponId = insertResult.data.id;
  try {
    const updateResult = await client
      .from("weapon_types")
      .update({ name: "Stage 25 Editor Updated" })
      .eq("id", weaponId)
      .select("id")
      .single();

    if (updateResult.error || !updateResult.data) {
      throw new Error(`editor update failed: ${updateResult.error?.message ?? "missing row"}`);
    }
  } finally {
    const deleteResult = await client.from("weapon_types").delete().eq("id", weaponId);
    if (deleteResult.error) {
      throw new Error(`editor cleanup failed: ${deleteResult.error.message}`);
    }
  }

  console.log("editor write lifecycle: ok");
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
