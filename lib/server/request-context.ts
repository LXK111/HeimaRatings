import { cookies, headers } from "next/headers";
import { normalizeRepositoryContext } from "@/lib/server/repositories/context";
import type { RepositoryContext } from "@/lib/server/repositories/context";

const organizationIdHeader = "x-heima-organization-id";
const organizationSlugHeader = "x-heima-organization-slug";
const organizationIdCookie = "heima_organization_id";
const organizationSlugCookie = "heima_organization_slug";

export async function getServerRepositoryContext(): Promise<RepositoryContext> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);

  return normalizeRepositoryContext({
    organizationId:
      headerStore.get(organizationIdHeader) ??
      cookieStore.get(organizationIdCookie)?.value,
    organizationSlug:
      headerStore.get(organizationSlugHeader) ??
      cookieStore.get(organizationSlugCookie)?.value
  });
}
