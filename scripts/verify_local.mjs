import { spawn } from "node:child_process";

const verifyPort = process.env.HEIMA_RATINGS_VERIFY_PORT ?? "3100";
const baseUrl = `http://localhost:${verifyPort}`;

async function main() {
  console.log("HEMA Ratings local verify");

  await runCommand("npm", ["run", "check"]);
  await runCommand("npm", ["run", "build"]);

  const server = spawn("npm", ["run", "start"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
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

  server.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await waitForServer(baseUrl);
    await runCommand("npm", ["run", "smoke"], {
      env: {
        ...process.env,
        HEIMA_RATINGS_BASE_URL: baseUrl
      }
    });
  } finally {
    stopServer();
  }

  console.log("Local verify passed.");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

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
      // The server is still starting.
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
