import { badRequest, created, ok, serverError, withServerError } from "@/lib/server/api-response";
import { requireManagementApiUser, requireManagementApiWriteAccess } from "@/lib/server/auth-guard";
import { readAuthorizedRepositoryContextFromRequest } from "@/lib/server/organization-access";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import type { CreateWeaponInput, UpdateWeaponInput } from "@/lib/server/repositories/types";

export async function GET(request: Request) {
  return withServerError(async () => {
    const authError = await requireManagementApiUser();
    if (authError) {
      return authError;
    }

    const repository = await getRequestRepository(await readAuthorizedRepositoryContextFromRequest(request));
    return ok(await repository.listWeapons());
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
    return created(await repository.createWeapon(readCreateWeaponInput(await request.json())));
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
    return ok(await repository.updateWeapon(readUpdateWeaponInput(await request.json())));
  } catch (error) {
    return isInputError(error) ? badRequest(error.message) : serverError(error);
  }
}

function readCreateWeaponInput(body: unknown): CreateWeaponInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  return {
    name: readRequiredString(body.name, "name"),
    slug: readWeaponSlug(body.slug),
    enabled: readOptionalBoolean(body.enabled) ?? true,
    sortOrder: readOptionalSortOrder(body.sortOrder)
  };
}

function readUpdateWeaponInput(body: unknown): UpdateWeaponInput {
  if (!isRecord(body)) {
    throw new TypeError("Request body must be an object");
  }

  return {
    id: readRequiredString(body.id, "id"),
    name: readOptionalString(body.name, "name"),
    slug: readOptionalWeaponSlug(body.slug),
    enabled: readOptionalBoolean(body.enabled),
    sortOrder: readOptionalSortOrder(body.sortOrder)
  };
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

function readWeaponSlug(value: unknown) {
  const slug = readRequiredString(value, "slug").toLowerCase();
  validateWeaponSlug(slug);
  return slug;
}

function readOptionalWeaponSlug(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TypeError("slug must be a string");
  }

  const slug = value.toLowerCase();
  validateWeaponSlug(slug);
  return slug;
}

function readOptionalBoolean(value: unknown, fallback?: boolean) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new TypeError("enabled must be a boolean");
  }

  return value;
}

function readOptionalSortOrder(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError("sortOrder must be a non-negative integer");
  }

  return value;
}

function validateWeaponSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError("slug must contain lowercase letters, numbers, and hyphens only");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInputError(error: unknown): error is TypeError | SyntaxError {
  return error instanceof TypeError || error instanceof SyntaxError;
}
