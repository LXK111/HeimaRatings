import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser, requireManagementApiWriteAccess } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import type { CreateTournamentEventInput, UpdateTournamentEventInput } from "@/lib/server/repositories/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const { id } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listTournamentEvents(id));
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

    const { id } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return created(await repository.createTournamentEvent(id, readCreateTournamentEventInput(await request.json())));
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

    const { id } = await context.params;
    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.updateTournamentEvent(id, readUpdateTournamentEventInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

function readCreateTournamentEventInput(body: unknown): CreateTournamentEventInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  return {
    name: readRequiredString(body.name, "name"),
    weaponTypeId: readRequiredString(body.weaponTypeId, "weaponTypeId"),
    format: readTournamentFormat(body.format),
    status: readLifecycleStatus(body.status)
  };
}

function readUpdateTournamentEventInput(body: unknown): UpdateTournamentEventInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  const input = {
    id: readRequiredString(body.id, "id"),
    name: readOptionalString(body.name, "name"),
    weaponTypeId: readOptionalString(body.weaponTypeId, "weaponTypeId"),
    format: readOptionalTournamentFormat(body.format),
    status: readOptionalLifecycleStatus(body.status)
  };
  if (
    input.name === undefined &&
    input.weaponTypeId === undefined &&
    input.format === undefined &&
    input.status === undefined
  ) {
    throw new TypeError("At least one tournament event field is required");
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
    return value as CreateTournamentEventInput["format"];
  }

  throw new TypeError("format is invalid");
}

function readOptionalTournamentFormat(value: unknown) {
  return value === undefined ? undefined : readTournamentFormat(value);
}

function readLifecycleStatus(value: unknown) {
  if (typeof value === "string" && ["draft", "active", "completed"].includes(value)) {
    return value as CreateTournamentEventInput["status"];
  }

  throw new TypeError("status is invalid");
}

function readOptionalLifecycleStatus(value: unknown) {
  return value === undefined ? undefined : readLifecycleStatus(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInputError(error: unknown): error is TypeError | SyntaxError {
  return error instanceof TypeError || error instanceof SyntaxError;
}
