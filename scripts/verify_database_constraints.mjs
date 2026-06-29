import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

loadLocalEnvFile(".env.database.local");

const databaseUrl = process.env.DATABASE_URL;
const validationsDir = join(process.cwd(), "database", "validations");

async function main() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to verify database constraints.");
  }

  if (!existsSync(validationsDir)) {
    throw new Error(`Database validations directory was not found: ${validationsDir}`);
  }

  const validationFiles = readdirSync(validationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => join(validationsDir, fileName));

  if (validationFiles.length === 0) {
    throw new Error(`No database validation SQL files were found in ${validationsDir}`);
  }

  for (const validationFile of validationFiles) {
    console.log(`Running database validation: ${validationFile}`);
    await runCommand("psql", [
      databaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      validationFile
    ]);
  }

  console.log("Database constraint verification passed.");
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    child.on("error", () => {
      reject(new Error("psql is required to verify database constraints."));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
