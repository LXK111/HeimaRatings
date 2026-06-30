import type { OrganizationMembership, OrganizationRole } from "@/lib/domain/types";
import { getRepository } from "@/lib/server/repositories/factory";
import {
  normalizeRepositoryContext,
  readRepositoryContextFromRequest
} from "@/lib/server/repositories/context";
import type { RepositoryContext } from "@/lib/server/repositories/context";
import { getCurrentAuthUser, isManagementAuthRequired } from "@/lib/server/supabase/auth";

export interface AuthorizedOrganizationState {
  context: RepositoryContext;
  memberships: OrganizationMembership[];
  activeMembership?: OrganizationMembership;
}

export async function getAuthorizedOrganizationState(
  rawContext: RepositoryContext,
  user?: { id: string }
): Promise<AuthorizedOrganizationState> {
  const context = normalizeRepositoryContext(rawContext);
  if (!isManagementAuthRequired()) {
    return { context, memberships: [] };
  }

  const currentUser = user ?? await getCurrentAuthUser();
  if (!currentUser) {
    return { context, memberships: [] };
  }

  const memberships = await getRepository().listUserOrganizationMemberships(currentUser.id);
  const activeMembership = resolveActiveMembership(context, memberships);
  if (!activeMembership) {
    throw new Error("Current user is not a member of any organization");
  }

  return {
    context: {
      organizationId: activeMembership.organizationId,
      organizationSlug: activeMembership.organizationSlug
    },
    memberships,
    activeMembership
  };
}

export async function authorizeRepositoryContext(
  rawContext: RepositoryContext,
  user?: { id: string }
) {
  return (await getAuthorizedOrganizationState(rawContext, user)).context;
}

export async function readAuthorizedRepositoryContextFromRequest(
  request: Request,
  user?: { id: string }
) {
  return authorizeRepositoryContext(readRepositoryContextFromRequest(request), user);
}

export async function getActiveOrganizationMembership(
  rawContext: RepositoryContext,
  user: { id: string }
) {
  return (await getAuthorizedOrganizationState(rawContext, user)).activeMembership;
}

export function canWriteOrganization(role: OrganizationRole | undefined) {
  return role === "admin" || role === "editor";
}

function resolveActiveMembership(
  context: RepositoryContext,
  memberships: OrganizationMembership[]
) {
  if (memberships.length === 0) {
    return undefined;
  }

  if (context.organizationId) {
    return memberships.find((membership) => membership.organizationId === context.organizationId);
  }

  if (context.organizationSlug) {
    return memberships.find((membership) => membership.organizationSlug === context.organizationSlug);
  }

  return memberships[0];
}
