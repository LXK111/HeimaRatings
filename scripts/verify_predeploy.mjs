import { spawn } from "node:child_process";

async function main() {
  console.log("HEMA Ratings predeploy verify");
  await runCommand("npm", ["run", "check"]);
  await runCommand("npm", ["run", "ranking:verify"]);
  await runCommand("npm", ["run", "verify"], {
    env: {
      ...process.env,
      HEIMA_RATINGS_DATA_SOURCE: "mock"
    }
  });
  console.log("Predeploy verify passed.");
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
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
        return;
      }
      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
