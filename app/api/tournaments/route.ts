import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser, requireManagementApiWriteAccess } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import type { CreateTournamentInput, UpdateTournamentInput } from "@/lib/server/repositories/types";

export async function GET(request: Request) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listTournaments());
  });
}

export async function POST(request: Request) {
  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }
    const writeError = await requireManagementApiWriteAccess(request);
    if (writeError) {
      return writeError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return created(await repository.createTournament(readCreateTournamentInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }
    const writeError = await requireManagementApiWriteAccess(request);
    if (writeError) {
      return writeError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.updateTournament(readUpdateTournamentInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

function readCreateTournamentInput(body: unknown): CreateTournamentInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  return {
    name: readRequiredString(body.name, "name"),
    format: readTournamentFormat(body.format),
    status: readLifecycleStatus(body.status),
    defaultAlgorithm: readRankingAlgorithm(body.defaultAlgorithm),
    startedAt: readOptionalString(body.startedAt, "startedAt"),
    endedAt: readOptionalString(body.endedAt, "endedAt")
  };
}

function readUpdateTournamentInput(body: unknown): UpdateTournamentInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  const input = {
    id: readRequiredString(body.id, "id"),
    name: readOptionalString(body.name, "name"),
    format: readOptionalTournamentFormat(body.format),
    status: readOptionalLifecycleStatus(body.status),
    defaultAlgorithm: readOptionalRankingAlgorithm(body.defaultAlgorithm),
    startedAt: readOptionalString(body.startedAt, "startedAt"),
    endedAt: readOptionalString(body.endedAt, "endedAt")
  };
  if (
    input.name === undefined &&
    input.format === undefined &&
    input.status === undefined &&
    input.defaultAlgorithm === undefined &&
    input.startedAt === undefined &&
    input.endedAt === undefined
  ) {
    throw new TypeError("At least one tournament field is required");
  }

  return input;
}

function readRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} is required`);
  }

  return value;
}

function readOptionalString(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string`);
  }

  return value;
}

function readTournamentFormat(value: unknown) {
  if (typeof value === "string" && ["single_elimination", "round_robin", "swiss", "custom"].includes(value)) {
    return value as CreateTournamentInput["format"];
  }

  throw new TypeError("format is invalid");
}

function readOptionalTournamentFormat(value: unknown) {
  return value === undefined ? undefined : readTournamentFormat(value);
}

function readLifecycleStatus(value: unknown) {
  if (typeof value === "string" && ["draft", "active", "completed"].includes(value)) {
    return value as CreateTournamentInput["status"];
  }

  throw new TypeError("status is invalid");
}

function readOptionalLifecycleStatus(value: unknown) {
  return value === undefined ? undefined : readLifecycleStatus(value);
}

function readRankingAlgorithm(value: unknown) {
  if (typeof value === "string" && ["elo", "sdr", "glicko2", "hybrid"].includes(value)) {
    return value as CreateTournamentInput["defaultAlgorithm"];
  }

  throw new TypeError("defaultAlgorithm is invalid");
}

function readOptionalRankingAlgorithm(value: unknown) {
  return value === undefined ? undefined : readRankingAlgorithm(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInputError(error: unknown): error is TypeError | SyntaxError {
  return error instanceof TypeError || error instanceof SyntaxError;
}
