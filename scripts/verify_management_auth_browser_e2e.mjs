import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

for (const fileName of [".env.local", ".env.database.local"]) {
  loadLocalEnvFile(fileName);
}

const verifyPort = process.env.HEIMA_RATINGS_AUTH_BROWSER_VERIFY_PORT ?? "3300";
const baseUrl = process.env.HEIMA_RATINGS_AUTH_BROWSER_VERIFY_BASE_URL ?? `http://localhost:${verifyPort}`;
const chromeExecutablePath =
  process.env.HEIMA_RATINGS_BROWSER_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  console.log("HEMA Ratings management Auth browser E2E verify");
  const config = readConfig();

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
    await verifyBrowserAuthFlow(baseUrl, config);
  } finally {
    stopServer();
  }

  console.log("Management Auth browser E2E verify passed.");
}

function readConfig() {
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  return {
    editorEmail: requireEnv("HEIMA_RATINGS_RLS_EDITOR_EMAIL"),
    editorPassword: requireEnv("HEIMA_RATINGS_RLS_EDITOR_PASSWORD")
  };
}

async function verifyBrowserAuthFlow(url, config) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(chromeExecutablePath) ? chromeExecutablePath : undefined
  });
  const pageErrors = [];
  const consoleErrors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    await verifyAnonymousManagementRedirect(page, url);
    await verifyAnonymousPublicPage(page, url);
    await verifyEditorLogin(page, url, config);

    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors:\n${pageErrors.join("\n")}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors:\n${consoleErrors.join("\n")}`);
    }
  } finally {
    await browser.close();
  }
}

async function verifyAnonymousManagementRedirect(page, url) {
  await page.goto(new URL("/weapons", url).toString(), { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) {
    throw new Error(`anonymous management page should redirect to /login, got ${page.url()}`);
  }
  await expectText(page, "管理端登录", "anonymous management redirect");
  console.log("anonymous management redirect: ok");
}

async function verifyAnonymousPublicPage(page, url) {
  const response = await page.goto(new URL("/public/rankings/demo", url).toString(), {
    waitUntil: "networkidle"
  });
  if (!response || !response.ok()) {
    throw new Error(`anonymous public page returned HTTP ${response?.status() ?? "unknown"}`);
  }
  if (page.url().includes("/login")) {
    throw new Error(`anonymous public page should not redirect to /login, got ${page.url()}`);
  }
  if (await hasVisibleText(page, "武器切换")) {
    console.log("anonymous public page: ok");
    return;
  }
  await expectText(page, "榜单不可用", "anonymous public page");
  console.log("anonymous public page: ok");
}

async function verifyEditorLogin(page, url, config) {
  await page.goto(new URL("/login?next=/weapons", url).toString(), { waitUntil: "networkidle" });
  await page.getByLabel("邮箱").fill(config.editorEmail);
  await page.getByLabel("密码").fill(config.editorPassword);
  await Promise.all([
    page.waitForURL("**/weapons", { timeout: 15000 }),
    page.getByRole("button", { name: "登录" }).click()
  ]);
  await page.waitForLoadState("networkidle");
  await expectText(page, "武器类型管理", "editor login weapons");
  await expectText(page, "武器积分池", "editor login weapons");

  await page.goto(new URL("/tournaments/demo/matches", url).toString(), { waitUntil: "networkidle" });
  await expectText(page, "比赛录入", "editor matches page");
  await page.getByLabel("发布目标").waitFor({ state: "visible", timeout: 5000 });
  console.log("editor browser login: ok");
}

async function expectText(page, text, label) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
    throw new Error(`${label} did not show expected text: ${text}`);
  });
}

async function hasVisibleText(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  try {
    await locator.waitFor({ state: "visible", timeout: 1500 });
    return true;
  } catch {
    return false;
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

async function waitForServer(url) {
  const timeoutMs = 30000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(new URL("/login", url), { redirect: "manual" });
      if (response.ok) {
        return;
      }
    } catch {
      // The production server is still booting.
    }

    await sleep(1000);
  }

  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
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
