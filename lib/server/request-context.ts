import { cookies, headers } from "next/headers";
import { requireManagementUser } from "@/lib/server/auth-guard";
import { authorizeRepositoryContext } from "@/lib/server/organization-access";
import { normalizeRepositoryContext } from "@/lib/server/repositories/context";
import type { RepositoryContext } from "@/lib/server/repositories/context";

const organizationIdHeader = "x-heima-organization-id";
const organizationSlugHeader = "x-heima-organization-slug";
const organizationIdCookie = "heima_organization_id";
const organizationSlugCookie = "heima_organization_slug";

interface ServerRepositoryContextOptions {
  authorize?: boolean;
}

export async function getServerRepositoryContext(
  options: ServerRepositoryContextOptions = {}
): Promise<RepositoryContext> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);

  const context = normalizeRepositoryContext({
    organizationId:
      headerStore.get(organizationIdHeader) ??
      cookieStore.get(organizationIdCookie)?.value,
    organizationSlug:
      headerStore.get(organizationSlugHeader) ??
      cookieStore.get(organizationSlugCookie)?.value
  });

  if (options.authorize === false) {
    return context;
  }

  const user = await requireManagementUser();
  return authorizeRepositoryContext(context, user);
}
