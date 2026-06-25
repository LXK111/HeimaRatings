import { spawn } from "node:child_process";

const baseUrl = process.env.HEIMA_RATINGS_BASE_URL ?? "http://localhost:3000";

async function main() {
  console.log(`HEMA Ratings smoke check: ${baseUrl}`);

  await checkCommand("node", ["--version"]);
  await checkCommand("npm", ["--version"]);
  await checkCommand("python3", ["--version"]);

  await checkJson("/api/weapons", "weapons", (data) => {
    assertArray(data, "data");
    assert(data.length > 0, "weapons should not be empty");
    assert(typeof data[0].id === "string", "weapon.id should be a string");
  });

  await checkJson("/api/tournaments", "tournaments", (data) => {
    assertArray(data, "data");
    assert(data.length > 0, "tournaments should not be empty");
    assert(typeof data[0].name === "string", "tournament.name should be a string");
  });

  await checkJson(
    "/api/rankings/calculate",
    "ranking engine",
    (data) => {
      assert(data.algorithm === "hybrid", "ranking algorithm should be hybrid");
      assertArray(data.rankings, "data.rankings");
      assert(data.rankings.length > 0, "rankings should not be empty");
      assert(typeof data.rankings[0].rating === "number", "ranking.rating should be a number");
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        algorithm: "hybrid",
        weaponTypeId: "weapon-longsword",
        tournamentId: "demo"
      })
    }
  );

  await checkJson("/api/public/rankings/demo", "public rankings", (data) => {
    assert(data.enabled === true, "public page should be enabled");
    assertArray(data.weapons, "data.weapons");
    assert(data.rankingsByWeapon && typeof data.rankingsByWeapon === "object", "rankingsByWeapon should be an object");
    assert(typeof data.iframeCode === "string", "iframeCode should be a string");
  });

  console.log("Smoke check passed.");
}

function checkCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString("utf8");
    });

    child.on("error", () => {
      reject(new Error(`${command} is not available. Please install it before running smoke checks.`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} check failed: ${errorOutput || output}`));
        return;
      }

      console.log(`${command}: ${(output || errorOutput).trim()}`);
      resolve();
    });
  });
}

async function checkJson(path, label, validate, init) {
  const url = new URL(path, baseUrl);
  let response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(
      `${label} request failed. Is the local server running? Start it with npm run dev or npm run start. ${error}`
    );
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}: ${text}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${label} did not return valid JSON: ${text}`);
  }

  assert(payload && typeof payload === "object", `${label} payload should be an object`);
  assert("data" in payload, `${label} payload should contain data`);
  validate(payload.data);
  console.log(`${label}: ok`);
}

function assertArray(value, name) {
  assert(Array.isArray(value), `${name} should be an array`);
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
