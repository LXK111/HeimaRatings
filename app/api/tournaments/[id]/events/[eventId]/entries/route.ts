import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser, requireManagementApiWriteAccess } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import type {
  CreateTournamentEventEntryInput,
  UpdateTournamentEventEntryInput
} from "@/lib/server/repositories/types";

interface RouteContext {
  params: Promise<{ id: string; eventId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const { id, eventId } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listTournamentEventEntries(id, eventId));
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }
    const writeError = await requireManagementApiWriteAccess(request);
    if (writeError) {
      return writeError;
    }

    const { id, eventId } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return created(await repository.createTournamentEventEntry(id, eventId, readCreateEntryInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }
    const writeError = await requireManagementApiWriteAccess(request);
    if (writeError) {
      return writeError;
    }

    const { id, eventId } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.updateTournamentEventEntry(id, eventId, readUpdateEntryInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

function readCreateEntryInput(body: unknown): CreateTournamentEventEntryInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  return {
    playerId: readRequiredString(body.playerId, "playerId"),
    seed: readOptionalSeed(body.seed)
  };
}

function readUpdateEntryInput(body: unknown): UpdateTournamentEventEntryInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  const input = {
    id: readRequiredString(body.id, "id"),
    seed: readOptionalSeed(body.seed),
    status: readOptionalStatus(body.status)
  };
  if (input.seed === undefined && input.status === undefined) {
    throw new TypeError("At least one tournament event entry field is required");
  }

  return input;
}

function readRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} is required`);
  }

  return value;
}

function readOptionalSeed(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new TypeError("seed must be a positive integer");
  }

  return value;
}

function readOptionalStatus(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string" && ["registered", "withdrawn"].includes(value)) {
    return value as UpdateTournamentEventEntryInput["status"];
  }

  throw new TypeError("entry status is invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInputError(error: unknown): error is TypeError | SyntaxError {
  return error instanceof TypeError || error instanceof SyntaxError;
}
