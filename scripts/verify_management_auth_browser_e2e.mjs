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

    const editorContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const editorPage = await newTrackedPage(editorContext, pageErrors, consoleErrors);
    const editorSeed = await verifyEditorWriteAccess(editorPage, url, config);
    await editorContext.close();

    const viewerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const viewerPage = await newTrackedPage(viewerContext, pageErrors, consoleErrors);
    await verifyViewerReadOnlyAccess(viewerPage, url, config, editorSeed);
    await viewerContext.close();

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
    if (!isExpectedBrowserPageError(error.message)) {
      pageErrors.push(error.message);
    }
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
  const editorSeed = await verifyEditorManagementForms(page, url);
  console.log("editor browser form write: ok");
  return editorSeed;
}

async function verifyViewerReadOnlyAccess(page, url, config, editorSeed) {
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
  await verifyViewerManagementFormDenials(page, url, editorSeed);
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

async function verifyEditorManagementForms(page, url) {
  const suffix = randomSuffix();
  const weaponName = `Stage46 武器 ${suffix}`;
  const playerName = `Stage46 选手 ${suffix}`;
  const tournamentName = `Stage46 赛事 ${suffix}`;
  const eventName = `Stage46 项目 ${suffix}`;

  await submitCreateForm(page, url, {
    path: "/weapons",
    panelTitle: "新增武器类型",
    buttonName: "新增",
    label: "editor weapon form write",
    fields: [
      { label: "名称", value: weaponName },
      { label: "标识", value: `stage46-${suffix}` },
      { label: "排序", value: "9999" }
    ],
    expectedText: weaponName,
    expectOk: true
  });

  await submitCreateForm(page, url, {
    path: "/players",
    panelTitle: "新增选手",
    buttonName: "新增",
    label: "editor player form write",
    fields: [
      { label: "姓名", value: playerName },
      { label: "俱乐部", value: "Stage46 Club" },
      { label: "初始积分", value: "1500" }
    ],
    expectedText: playerName,
    expectOk: true
  });

  await submitCreateForm(page, url, {
    path: "/tournaments",
    panelTitle: "新增赛事",
    buttonName: "新增",
    label: "editor tournament form write",
    fields: [{ label: "名称", value: tournamentName }],
    expectedText: tournamentName,
    expectOk: true
  });

  await submitCreateForm(page, url, {
    path: "/tournaments/demo/events",
    panelTitle: "新增比赛项目",
    buttonName: "新增",
    label: "editor tournament event form write",
    fields: [{ label: "项目名称", value: eventName }],
    expectedText: eventName,
    expectOk: true
  });
  await submitEntryForm(page, url, {
    eventName,
    label: "editor event entry form write",
    expectOk: true
  });
  const editorSeed = await verifyEditorInlineEditForms(page, url, {
    eventName,
    playerName,
    tournamentName,
    weaponName
  });

  console.log("editor management forms: ok");
  return editorSeed;
}

async function verifyViewerManagementFormDenials(page, url, editorSeed) {
  const suffix = randomSuffix();
  await submitCreateForm(page, url, {
    path: "/weapons",
    panelTitle: "新增武器类型",
    buttonName: "新增",
    label: "viewer weapon form write denial",
    fields: [
      { label: "名称", value: `Stage46 Viewer Weapon ${suffix}` },
      { label: "标识", value: `stage46-viewer-${suffix}` },
      { label: "排序", value: "9998" }
    ],
    expectOk: false
  });

  await submitCreateForm(page, url, {
    path: "/players",
    panelTitle: "新增选手",
    buttonName: "新增",
    label: "viewer player form write denial",
    fields: [
      { label: "姓名", value: `Stage46 Viewer Player ${suffix}` },
      { label: "俱乐部", value: "Stage46 Viewer Club" },
      { label: "初始积分", value: "1500" }
    ],
    expectOk: false
  });

  await submitCreateForm(page, url, {
    path: "/tournaments",
    panelTitle: "新增赛事",
    buttonName: "新增",
    label: "viewer tournament form write denial",
    fields: [{ label: "名称", value: `Stage46 Viewer Tournament ${suffix}` }],
    expectOk: false
  });

  await submitCreateForm(page, url, {
    path: "/tournaments/demo/events",
    panelTitle: "新增比赛项目",
    buttonName: "新增",
    label: "viewer tournament event form write denial",
    fields: [{ label: "项目名称", value: `Stage46 Viewer Event ${suffix}` }],
    expectOk: false
  });
  await submitEntryForm(page, url, {
    eventName: editorSeed.eventName,
    label: "viewer event entry form write denial",
    expectOk: false
  });
  await verifyViewerInlineEditFormDenials(page, url, editorSeed);

  console.log("viewer management form denials: ok");
}

async function verifyEditorInlineEditForms(page, url, seed) {
  const suffix = randomSuffix();
  const nextWeaponName = `${seed.weaponName} 编辑`;
  const nextPlayerName = `${seed.playerName} 编辑`;
  const nextTournamentName = `${seed.tournamentName} 编辑`;
  const nextEventName = `${seed.eventName} 编辑`;

  await submitInlineEditForm(page, url, {
    path: "/weapons",
    rowText: seed.weaponName,
    formText: "名称",
    fields: [{ label: "名称", value: nextWeaponName }],
    expectedText: nextWeaponName,
    expectOk: true,
    label: "editor weapon inline edit"
  });
  await submitInlineEditForm(page, url, {
    path: "/players",
    rowText: seed.playerName,
    formText: "姓名",
    fields: [
      { label: "姓名", value: nextPlayerName },
      { label: "俱乐部", value: `Stage47 Club ${suffix}` }
    ],
    expectedText: nextPlayerName,
    expectOk: true,
    label: "editor player inline edit"
  });
  await submitInlineEditForm(page, url, {
    path: "/tournaments",
    rowText: seed.tournamentName,
    formText: "名称",
    fields: [{ label: "名称", value: nextTournamentName }],
    expectedText: nextTournamentName,
    expectOk: true,
    label: "editor tournament inline edit"
  });
  await submitInlineEditForm(page, url, {
    path: "/tournaments/demo/events",
    rowText: seed.eventName,
    formText: "项目名称",
    fields: [{ label: "项目名称", value: nextEventName }],
    expectedText: nextEventName,
    expectOk: true,
    label: "editor tournament event inline edit"
  });
  await submitEntryInlineEditForm(page, url, {
    eventName: nextEventName,
    expectOk: true,
    label: "editor event entry inline edit"
  });

  console.log("editor inline edit forms: ok");
  return {
    eventName: nextEventName,
    playerName: nextPlayerName,
    tournamentName: nextTournamentName,
    weaponName: nextWeaponName
  };
}

async function verifyViewerInlineEditFormDenials(page, url, seed) {
  const suffix = randomSuffix();
  await submitInlineEditForm(page, url, {
    path: "/weapons",
    rowText: seed.weaponName,
    formText: "名称",
    fields: [{ label: "名称", value: `${seed.weaponName} Viewer ${suffix}` }],
    expectOk: false,
    label: "viewer weapon inline edit denial"
  });
  await submitInlineEditForm(page, url, {
    path: "/players",
    rowText: seed.playerName,
    formText: "姓名",
    fields: [{ label: "姓名", value: `${seed.playerName} Viewer ${suffix}` }],
    expectOk: false,
    label: "viewer player inline edit denial"
  });
  await submitInlineEditForm(page, url, {
    path: "/tournaments",
    rowText: seed.tournamentName,
    formText: "名称",
    fields: [{ label: "名称", value: `${seed.tournamentName} Viewer ${suffix}` }],
    expectOk: false,
    label: "viewer tournament inline edit denial"
  });
  await submitInlineEditForm(page, url, {
    path: "/tournaments/demo/events",
    rowText: seed.eventName,
    formText: "项目名称",
    fields: [{ label: "项目名称", value: `${seed.eventName} Viewer ${suffix}` }],
    expectOk: false,
    label: "viewer tournament event inline edit denial"
  });
  await submitEntryInlineEditForm(page, url, {
    eventName: seed.eventName,
    expectOk: false,
    label: "viewer event entry inline edit denial"
  });

  console.log("viewer inline edit form denials: ok");
}

async function submitCreateForm(
  page,
  url,
  { path, panelTitle, buttonName, fields, expectedText, expectOk, label }
) {
  await page.goto(new URL(path, url).toString(), { waitUntil: "networkidle" });
  await expectText(page, panelTitle, `${label} page`);
  const form = page.locator("section").filter({ hasText: panelTitle }).first().locator("form").first();
  await form.waitFor({ state: "visible", timeout: 5000 });
  for (const field of fields) {
    await form.getByLabel(field.label).fill(field.value);
  }

  const response = await submitServerActionForm(page, form, path, buttonName);
  if (expectOk) {
    assertSuccessfulActionResponse(response, label);
    if (expectedText) {
      await expectText(page, expectedText, label, 15000);
    }
  } else {
    assertDeniedActionResponse(response, label);
  }
}

async function submitEntryForm(page, url, { eventName, expectOk, label }) {
  const path = "/tournaments/demo/events";
  await page.goto(new URL(path, url).toString(), { waitUntil: "networkidle" });
  await expectText(page, eventName, `${label} page`);
  const row = page.locator("tr").filter({ hasText: eventName }).first();
  await row.waitFor({ state: "visible", timeout: 5000 });
  const form = row.locator("form").filter({ hasText: "加入选手" }).first();
  await form.waitFor({ state: "visible", timeout: 5000 });

  const playerSelect = form.getByLabel("加入选手");
  if (await playerSelect.isDisabled()) {
    throw new Error(`${label} requires an available player to add`);
  }
  await playerSelect.selectOption({ index: 0 });
  await form.getByLabel("种子").fill(expectOk ? "1" : "2");

  const response = await submitServerActionForm(page, form, path, "加入");
  if (expectOk) {
    assertSuccessfulActionResponse(response, label);
  } else {
    assertDeniedActionResponse(response, label);
  }
}

async function submitInlineEditForm(
  page,
  url,
  { path, rowText, formText, fields, expectedText, expectOk, label }
) {
  await page.goto(new URL(path, url).toString(), { waitUntil: "networkidle" });
  await expectText(page, rowText, `${label} page`);
  const row = page.locator("tr").filter({ hasText: rowText }).first();
  await row.waitFor({ state: "visible", timeout: 5000 });
  const form = row.locator("form").filter({ hasText: formText }).last();
  await form.waitFor({ state: "visible", timeout: 5000 });

  for (const field of fields) {
    await form.getByLabel(field.label).fill(field.value);
  }

  const response = await submitServerActionForm(page, form, path, "保存");
  if (expectOk) {
    assertSuccessfulActionResponse(response, label);
    if (expectedText) {
      await expectText(page, expectedText, label, 15000);
    }
  } else {
    assertDeniedActionResponse(response, label);
  }
}

async function submitEntryInlineEditForm(page, url, { eventName, expectOk, label }) {
  const path = "/tournaments/demo/events";
  await page.goto(new URL(path, url).toString(), { waitUntil: "networkidle" });
  await expectText(page, eventName, `${label} page`);
  const row = page.locator("tr").filter({ hasText: eventName }).first();
  await row.waitFor({ state: "visible", timeout: 5000 });
  const form = row.locator("form").filter({ hasText: "状态" }).first();
  await form.waitFor({ state: "visible", timeout: 5000 });
  await form.getByLabel("种子").fill(expectOk ? "3" : "4");

  const response = await submitServerActionForm(page, form, path, "保存");
  if (expectOk) {
    assertSuccessfulActionResponse(response, label);
  } else {
    assertDeniedActionResponse(response, label);
  }
}

async function submitServerActionForm(page, form, path, buttonName) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(path) && response.request().method() === "POST",
    { timeout: 15000 }
  );
  await form.getByRole("button", { name: buttonName }).click();
  const response = await responsePromise;
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return response;
}

function assertSuccessfulActionResponse(response, label) {
  if (response.status() >= 400) {
    throw new Error(`${label} should succeed, got HTTP ${response.status()}`);
  }
}

function assertDeniedActionResponse(response, label) {
  if (response.status() < 400) {
    throw new Error(`${label} should be denied, got HTTP ${response.status()}`);
  }
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

function randomSuffix() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
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
  return text.includes("Failed to load resource") &&
    (text.includes("403 (Forbidden)") || text.includes("500 (Internal Server Error)"));
}

function isExpectedBrowserPageError(text) {
  return text.includes("An error occurred in the Server Components render") &&
    text.includes("digest property");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
