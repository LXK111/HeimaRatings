import { spawn } from "node:child_process";
import { join } from "node:path";

const runnerPath = join(process.cwd(), "scripts", "ranking_engine_runner.py");

async function main() {
  console.log("HEMA Ratings Ranking Engine regression verify");

  await verifyFixedRankingOutput();
  await verifyByeIsNotRankingMatch();

  console.log("Ranking Engine regression verify passed.");
}

async function verifyFixedRankingOutput() {
  const input = {
    algorithm: "hybrid",
    players: [
      { id: "p1", name: "Aria", rating: 1500, rd: 220, sigma: 0.2 },
      { id: "p2", name: "Bryn", rating: 1500, rd: 220, sigma: 0.2 },
      { id: "p3", name: "Cato", rating: 1500, rd: 220, sigma: 0.2 },
      { id: "p4", name: "Dara", rating: 1500, rd: 220, sigma: 0.2 }
    ],
    matches: [
      [
        { id: "m1", round: 1, player1: "Aria", player2: "Bryn", score1: 10, score2: 4 },
        { id: "m2", round: 1, player1: "Cato", player2: "Dara", score1: 8, score2: 10 }
      ],
      [
        { id: "m3", round: 2, player1: "Aria", player2: "Dara", score1: 10, score2: 9 }
      ]
    ]
  };

  const first = await runRankingEngine(input);
  const second = await runRankingEngine(input);
  assert(first.algorithm === "hybrid", "algorithm should be hybrid");
  assert(Array.isArray(first.rankings), "rankings should be an array");
  assert(first.rankings.length === 4, "fixed input should return 4 ranking rows");
  assert(
    stableRankingSignature(first) === stableRankingSignature(second),
    "ranking output signature should be stable for the same fixed input"
  );

  const aria = findRanking(first, "Aria");
  const dara = findRanking(first, "Dara");
  const bryn = findRanking(first, "Bryn");
  assert(aria.matches === 2, "Aria should have 2 matches");
  assert(aria.wins === 2, "Aria should have 2 wins");
  assert(dara.matches === 2, "Dara should have 2 matches");
  assert(dara.wins === 1, "Dara should have 1 win");
  assert(bryn.matches === 1, "Bryn should have 1 match");
  assert(typeof aria.rating === "number", "rating should be numeric");
  assert(Number.isFinite(aria.rating), "rating should be finite");

  console.log("fixed ranking output: ok");
}

async function verifyByeIsNotRankingMatch() {
  const players = [
    { id: "p1", name: "Aria", rating: 1500, rd: 220, sigma: 0.2 },
    { id: "p2", name: "Bryn", rating: 1500, rd: 220, sigma: 0.2 },
    { id: "p3", name: "Cato", rating: 1500, rd: 220, sigma: 0.2 },
    { id: "p4", name: "Dara", rating: 1500, rd: 220, sigma: 0.2 },
    { id: "p5", name: "Emil", rating: 1500, rd: 220, sigma: 0.2 }
  ];
  const realMatches = [
    [
      { id: "m1", round: 1, player1: "Aria", player2: "Bryn", score1: 10, score2: 4 },
      { id: "m2", round: 1, player1: "Cato", player2: "Dara", score1: 8, score2: 10 }
    ]
  ];
  const input = {
    algorithm: "hybrid",
    players,
    matches: realMatches
  };

  assertNoByeMatches(input, "Emil");
  const output = await runRankingEngine(input);
  const emil = findRanking(output, "Emil");
  assert(emil.matches === 0, "bye player should not receive a virtual match");
  assert(emil.wins === 0, "bye player should not receive a virtual win");
  assert(emil.losses === 0, "bye player should not receive a virtual loss");
  assert(countInputMatches(input, "Emil") === 0, "bye player should not appear in ranking input matches");

  console.log("bye exclusion: ok");
}

function runRankingEngine(input) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [runnerPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Ranking engine exited with code ${code}`));
        return;
      }

      const parsed = JSON.parse(stdout);
      if (parsed.error) {
        reject(new Error(parsed.error));
        return;
      }
      resolve(parsed);
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

function findRanking(output, name) {
  const row = output.rankings.find((ranking) => ranking.name === name);
  assert(row, `ranking row not found for ${name}`);
  return row;
}

function stableRankingSignature(output) {
  return output.rankings
    .map((row) => [
      row.name,
      row.rank,
      row.matches,
      row.wins,
      row.losses,
      row.draws,
      Math.round(row.rating * 100)
    ].join(":"))
    .join("|");
}

function assertNoByeMatches(input, byePlayerName) {
  for (const round of input.matches) {
    for (const match of round) {
      assert(match.player1 !== byePlayerName, "bye player should not be player1 in a match");
      assert(match.player2 !== byePlayerName, "bye player should not be player2 in a match");
    }
  }
}

function countInputMatches(input, playerName) {
  return input.matches
    .flat()
    .filter((match) => match.player1 === playerName || match.player2 === playerName)
    .length;
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
