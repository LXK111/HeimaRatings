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
    viewerEmail: requireEnv("HEIMA_RATINGS_RLS_VIEWER_EMAIL"),
    viewerPassword: requireEnv("HEIMA_RATINGS_RLS_VIEWER_PASSWORD"),
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

  try {
    const anonymousContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const anonymousPage = await newTrackedPage(anonymousContext, pageErrors, consoleErrors);
    await verifyAnonymousManagementRedirect(anonymousPage, url);
    await verifyAnonymousPublicPage(anonymousPage, url);
    await anonymousContext.close();

    const viewerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const viewerPage = await newTrackedPage(viewerContext, pageErrors, consoleErrors);
    await verifyViewerReadOnlyAccess(viewerPage, url, config);
    await viewerContext.close();

    const editorContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const editorPage = await newTrackedPage(editorContext, pageErrors, consoleErrors);
    await verifyEditorWriteAccess(editorPage, url, config);
    await editorContext.close();

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

async function newTrackedPage(context, pageErrors, consoleErrors) {
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!isExpectedBrowserConsoleError(text)) {
        consoleErrors.push(text);
      }
    }
  });

  return page;
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

async function verifyEditorWriteAccess(page, url, config) {
  await signIn(page, url, {
    email: config.editorEmail,
    password: config.editorPassword,
    nextPath: "/weapons",
    label: "editor"
  });
  await expectText(page, "武器类型管理", "editor login weapons");
  await expectText(page, "武器积分池", "editor login weapons");

  await submitMatchForm(page, url, {
    expectedText: "比赛已保存并加入当前计算队列。",
    label: "editor match form write"
  });
  console.log("editor browser form write: ok");
}

async function verifyViewerReadOnlyAccess(page, url, config) {
  await signIn(page, url, {
    email: config.viewerEmail,
    password: config.viewerPassword,
    nextPath: "/weapons",
    label: "viewer"
  });
  await expectText(page, "武器类型管理", "viewer login weapons");
  await expectText(page, "武器积分池", "viewer login weapons");

  const status = await page.evaluate(async () => {
    const response = await fetch("/api/rankings/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        algorithm: "hybrid",
        weaponTypeId: "weapon-longsword",
        tournamentId: "demo",
        persistSnapshot: true
      })
    });

    return response.status;
  });
  if (status !== 403) {
    throw new Error(`viewer ranking snapshot write should be denied with HTTP 403, got ${status}`);
  }

  await submitMatchForm(page, url, {
    expectedText: "Organization editor or admin role required",
    label: "viewer match form write denial"
  });
  console.log("viewer browser read-only access: ok");
}

async function signIn(page, url, { email, password, nextPath, label }) {
  await page.goto(new URL(`/login?next=${encodeURIComponent(nextPath)}`, url).toString(), {
    waitUntil: "networkidle"
  });
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await Promise.all([
    page.waitForURL(`**${nextPath}`, { timeout: 15000 }),
    page.getByRole("button", { name: "登录" }).click()
  ]);
  await page.waitForLoadState("networkidle");
  console.log(`${label} browser login: ok`);
}

async function submitMatchForm(page, url, { expectedText, label }) {
  await page.goto(new URL("/tournaments/demo/matches", url).toString(), { waitUntil: "networkidle" });
  await expectText(page, "比赛录入", `${label} page`);
  await page.getByLabel("发布目标").waitFor({ state: "visible", timeout: 5000 });

  await page.getByLabel("轮次").fill(String(9000 + Math.floor(Math.random() * 1000)));
  await selectFirstTwoPlayers(page, label);
  await page.getByLabel("A 得分").fill("13");
  await page.getByLabel("B 得分").fill("7");

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/tournaments/demo/matches") &&
      response.request().method() === "POST",
    { timeout: 15000 }
  );
  await page.getByRole("button", { name: "保存比赛" }).click();
  const response = await responsePromise;
  if (label.includes("editor") && !response.ok()) {
    throw new Error(`${label} POST failed with HTTP ${response.status()}: ${await response.text()}`);
  }
  if (label.includes("viewer") && response.status() !== 403) {
    throw new Error(`${label} should be denied with HTTP 403, got ${response.status()}`);
  }

  await expectText(page, expectedText, label, 15000);
}

async function selectFirstTwoPlayers(page, label) {
  const player1Select = page.getByLabel("选手 A");
  const player2Select = page.getByLabel("选手 B");
  await player1Select.waitFor({ state: "visible", timeout: 5000 });
  await player2Select.waitFor({ state: "visible", timeout: 5000 });

  const playerCount = await player1Select.locator("option").count();
  if (playerCount < 2) {
    throw new Error(`${label} requires at least 2 selectable players, got ${playerCount}`);
  }

  await player1Select.selectOption({ index: 0 });
  await player2Select.selectOption({ index: 1 });
}

async function expectText(page, text, label, timeout = 5000) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout }).catch(() => {
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

function isExpectedBrowserConsoleError(text) {
  return text.includes("Failed to load resource") && text.includes("403 (Forbidden)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
