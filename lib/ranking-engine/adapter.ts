import { spawn } from "node:child_process";
import path from "node:path";
import type {
  RankingAlgorithm,
  RankingEngineInput,
  RankingEngineOutput
} from "@/lib/domain/types";

interface PythonRankingRow {
  name: string;
  rank: number;
  rating: number;
  rd?: number;
  sigma?: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
}

interface PythonRankingOutput {
  algorithm: RankingAlgorithm;
  rankings: PythonRankingRow[];
}

const runnerPath = path.join(process.cwd(), "scripts", "ranking_engine_runner.py");

export async function runRankingEngine(input: RankingEngineInput): Promise<RankingEngineOutput> {
  const nameToId = new Map(input.players.map((player) => [player.name, player.id]));
  const runnerInput = JSON.stringify({
    algorithm: input.algorithm,
    players: input.players.map((player) => ({
      name: player.name,
      rating: player.rating,
      rd: player.rd,
      sigma: player.sigma
    })),
    matches: input.matches.map((roundMatches) =>
      roundMatches.map((match) => ({
        player1: match.player1,
        player2: match.player2,
        score1: match.score1,
        score2: match.score2
      }))
    )
  });

  const output = await runPython(runnerInput);
  const parsed = JSON.parse(output) as PythonRankingOutput;

  return {
    algorithm: parsed.algorithm,
    generatedAt: new Date().toISOString(),
    rankings: parsed.rankings.map((row) => ({
      playerId: nameToId.get(row.name) ?? row.name,
      name: row.name,
      rank: row.rank,
      rating: row.rating,
      rd: row.rd,
      sigma: row.sigma,
      matches: row.matches,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws
    }))
  };
}

function runPython(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [runnerPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Ranking engine exited with code ${code}`));
        return;
      }

      resolve(stdout.trim());
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}
