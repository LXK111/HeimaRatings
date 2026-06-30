import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser, requireManagementApiWriteAccess } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import type { CreatePlayerInput, UpdatePlayerInput } from "@/lib/server/repositories/types";

export async function GET(request: Request) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listPlayers());
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
    return created(await repository.createPlayer(readCreatePlayerInput(await request.json())));
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
    return ok(await repository.updatePlayer(readUpdatePlayerInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

function readCreatePlayerInput(body: unknown): CreatePlayerInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  return {
    name: readRequiredString(body.name, "name"),
    club: readOptionalString(body.club, "club"),
    initialRating: readOptionalRating(body.initialRating)
  };
}

function readUpdatePlayerInput(body: unknown): UpdatePlayerInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  const input = {
    id: readRequiredString(body.id, "id"),
    name: readOptionalString(body.name, "name"),
    club: readOptionalString(body.club, "club")
  };
  if (input.name === undefined && input.club === undefined) {
    throw new TypeError("At least one player field is required");
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

function readOptionalRating(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError("initialRating must be a non-negative number");
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInputError(error: unknown): error is TypeError | SyntaxError {
  return error instanceof TypeError || error instanceof SyntaxError;
}
