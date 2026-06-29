export interface RepositoryContext {
  organizationId?: string;
  organizationSlug?: string;
}

const organizationIdHeader = "x-heima-organization-id";
const organizationSlugHeader = "x-heima-organization-slug";
const organizationIdCookie = "heima_organization_id";
const organizationSlugCookie = "heima_organization_slug";

export function readRepositoryContextFromRequest(request: Request): RepositoryContext {
  const cookieHeader = request.headers.get("cookie");

  return normalizeRepositoryContext({
    organizationId:
      request.headers.get(organizationIdHeader) ??
      readCookieValue(cookieHeader, organizationIdCookie),
    organizationSlug:
      request.headers.get(organizationSlugHeader) ??
      readCookieValue(cookieHeader, organizationSlugCookie)
  });
}

export function normalizeRepositoryContext(context: RepositoryContext): RepositoryContext {
  return {
    organizationId: cleanValue(context.organizationId),
    organizationSlug: cleanValue(context.organizationSlug)
  };
}

export function repositoryContextCacheKey(context: RepositoryContext) {
  const normalized = normalizeRepositoryContext(context);
  return `${normalized.organizationId ?? ""}:${normalized.organizationSlug ?? ""}`;
}

function readCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${key}=`));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(key.length + 1));
}

function cleanValue(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}
