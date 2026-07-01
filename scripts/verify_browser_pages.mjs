import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const verifyPort = process.env.HEIMA_RATINGS_BROWSER_VERIFY_PORT ?? "3200";
const baseUrl = process.env.HEIMA_RATINGS_BROWSER_VERIFY_BASE_URL ?? `http://localhost:${verifyPort}`;
const chromeExecutablePath =
  process.env.HEIMA_RATINGS_BROWSER_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const pageChecks = [
  { path: "/", label: "home", texts: ["HEMA Ratings", "武器类型"] },
  { path: "/weapons", label: "weapons", texts: ["武器类型管理", "武器积分池"] },
  { path: "/players", label: "players", texts: ["选手管理", "选手名册"] },
  { path: "/tournaments", label: "tournaments", texts: ["赛事管理", "赛事列表"] },
  { path: "/tournaments/demo/events", label: "events", texts: ["比赛项目管理", "项目列表"] },
  {
    path: "/tournaments/demo/matches",
    label: "matches",
    texts: ["比赛录入", "计算与发布排名", "发布目标"]
  },
  { path: "/tournaments/demo/rankings", label: "rankings", texts: ["排名榜", "项目级排名计算"] },
  {
    path: "/public/rankings/demo",
    label: "public rankings",
    texts: ["HEMA 春季积分赛公开榜单", "武器切换", "iframe 嵌入代码"]
  },
  { path: "/embed/rankings/demo", label: "embed rankings", texts: ["HEMA Ratings Embed"] }
];

async function main() {
  console.log("HEMA Ratings browser page verify");

  await runCommand("npm", ["run", "build"], {
    env: {
      ...process.env,
      HEIMA_RATINGS_DATA_SOURCE: process.env.HEIMA_RATINGS_DATA_SOURCE ?? "mock"
    }
  });

  const server = spawn("npm", ["run", "start"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HEIMA_RATINGS_DATA_SOURCE: process.env.HEIMA_RATINGS_DATA_SOURCE ?? "mock",
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
    await verifyPages(baseUrl);
  } finally {
    stopServer();
  }

  console.log("Browser page verify passed.");
}

async function verifyPages(url) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(chromeExecutablePath) ? chromeExecutablePath : undefined
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    for (const check of pageChecks) {
      await verifyPage(page, url, check);
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
}

async function verifyPage(page, url, check) {
  const targetUrl = new URL(check.path, url).toString();
  const response = await page.goto(targetUrl, { waitUntil: "networkidle" });
  if (!response || !response.ok()) {
    throw new Error(`${check.label} returned HTTP ${response?.status() ?? "unknown"} at ${targetUrl}`);
  }

  for (const text of check.texts) {
    await expectText(page, text, check.label);
  }

  if (check.label === "matches") {
    const publishTargetSelect = page.getByLabel("发布目标");
    await publishTargetSelect.waitFor({ state: "visible", timeout: 5000 });
    const selectedValue = await publishTargetSelect.inputValue();
    if (!selectedValue) {
      throw new Error("matches publish target select should have a selected value");
    }
  }

  console.log(`${check.label}: ok`);
}

async function expectText(page, text, label) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
    throw new Error(`${label} did not show expected text: ${text}`);
  });
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
      const response = await fetch(new URL("/api/weapons", url));
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
