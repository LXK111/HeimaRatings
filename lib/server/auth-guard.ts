import { redirect } from "next/navigation";
import { forbidden, unauthorized } from "@/lib/server/api-response";
import { canWriteOrganization, getActiveOrganizationMembership } from "@/lib/server/organization-access";
import { readRepositoryContextFromRequest } from "@/lib/server/repositories/context";
import {
  getCurrentAuthUser,
  isManagementAuthRequired,
  isSupabaseAuthConfigured
} from "@/lib/server/supabase/auth";

export async function requireManagementUser() {
  if (!isManagementAuthRequired()) {
    return undefined;
  }

  if (!isSupabaseAuthConfigured()) {
    redirect("/login?error=Supabase%20Auth%20is%20not%20configured");
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireManagementApiUser() {
  if (!isManagementAuthRequired()) {
    return undefined;
  }

  if (!isSupabaseAuthConfigured()) {
    return unauthorized("Supabase Auth is not configured");
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    return unauthorized();
  }

  return undefined;
}

export async function requireManagementApiWriteAccess(request: Request) {
  if (!isManagementAuthRequired()) {
    return undefined;
  }

  if (!isSupabaseAuthConfigured()) {
    return unauthorized("Supabase Auth is not configured");
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    return unauthorized();
  }

  const membership = await getActiveOrganizationMembership(
    readRepositoryContextFromRequest(request),
    user
  );
  if (!canWriteOrganization(membership?.role)) {
    return forbidden("Organization editor or admin role required");
  }

  return undefined;
}
