import { spawn } from "node:child_process";

const verifyPort = process.env.HEIMA_RATINGS_RANKING_INPUT_VERIFY_PORT ?? "3500";
const baseUrl =
  process.env.HEIMA_RATINGS_RANKING_INPUT_VERIFY_BASE_URL ?? `http://localhost:${verifyPort}`;

async function main() {
  console.log("HEMA Ratings Ranking input construction verify");

  await runCommand("npm", ["run", "build"], {
    env: {
      ...process.env,
      HEIMA_RATINGS_DATA_SOURCE: "mock",
      HEIMA_RATINGS_AUTH_REQUIRED: "false"
    }
  });

  const server = spawn("npm", ["run", "start"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HEIMA_RATINGS_DATA_SOURCE: "mock",
      HEIMA_RATINGS_AUTH_REQUIRED: "false",
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
    await verifyLongswordEventInput();
    await verifySabreEventIsolation();
  } finally {
    stopServer();
  }

  console.log("Ranking input construction verify passed.");
}

async function verifyLongswordEventInput() {
  const matches = await getJson("/api/tournaments/demo/matches", "matches");
  const longswordMatches = matches.filter((match) => match.eventId === "event-longsword-open");
  assert(longswordMatches.length === 2, "longsword event should have 2 real matches in Mock data");
  assert(
    longswordMatches.every((match) => match.player1Name && match.player2Name),
    "all real matches should have two players"
  );
  assert(
    longswordMatches.every((match) => match.player1Name !== match.player2Name),
    "all real matches should have distinct players"
  );

  const firstRoundByePlayer = "许岚";
  const firstRoundMatches = longswordMatches.filter((match) => match.round === 1);
  assert(
    firstRoundMatches.every(
      (match) => match.player1Name !== firstRoundByePlayer && match.player2Name !== firstRoundByePlayer
    ),
    "first-round bye player should not appear in a virtual first-round match"
  );

  const ranking = await calculateRanking({
    algorithm: "hybrid",
    weaponTypeId: "weapon-longsword",
    tournamentId: "demo",
    eventId: "event-longsword-open"
  });
  assert(ranking.algorithm === "hybrid", "longsword event ranking algorithm should be hybrid");
  assertTotalMatchCount(ranking.rankings, 2, "longsword event");
  assertRankingStats(ranking, "林澈", { matches: 2, wins: 2, losses: 0 });
  assertRankingStats(ranking, "周衡", { matches: 1, wins: 0, losses: 1 });
  assertRankingStats(ranking, "许岚", { matches: 1, wins: 0, losses: 1 });

  console.log("longsword event input construction: ok");
}

async function verifySabreEventIsolation() {
  const ranking = await calculateRanking({
    algorithm: "hybrid",
    weaponTypeId: "weapon-sabre",
    tournamentId: "demo",
    eventId: "event-sabre-open"
  });

  assertTotalMatchCount(ranking.rankings, 1, "sabre event");
  assertRankingStats(ranking, "许岚", { matches: 1, wins: 1, losses: 0 });
  assertRankingStats(ranking, "林澈", { matches: 1, wins: 0, losses: 1 });
  assert(
    !ranking.rankings.some((row) => row.name === "周衡"),
    "sabre event ranking should not include players without sabre ratings"
  );

  console.log("sabre event isolation: ok");
}

async function calculateRanking(body) {
  return getJson("/api/rankings/calculate", "ranking calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
