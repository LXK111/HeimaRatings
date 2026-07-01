import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  BarChart3,
  Globe2,
  Home,
  ListChecks,
  Swords,
  Trophy,
  UsersRound
} from "lucide-react";
import { signOut } from "@/lib/server/auth-actions";
import { requireManagementUser } from "@/lib/server/auth-guard";
import { getAuthorizedOrganizationState } from "@/lib/server/organization-access";
import { getRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";
import { getCurrentAuthUser, isManagementAuthRequired } from "@/lib/server/supabase/auth";

const navigationItems = [
  { href: "/", label: "控制台", icon: Home },
  { href: "/weapons", label: "武器类型", icon: Swords },
  { href: "/players", label: "选手", icon: UsersRound },
  { href: "/tournaments", label: "赛事", icon: Trophy },
  { href: "/tournaments", label: "比赛项目", icon: ListChecks },
  { href: "/tournaments", label: "排名榜", icon: BarChart3 },
  { href: "/public/rankings/demo", label: "公开榜单", icon: Globe2 }
];

interface AppShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  showOrganizationSwitcher?: boolean;
  children: React.ReactNode;
}

export async function AppShell({
  title,
  description,
  showOrganizationSwitcher = true,
  children
}: AppShellProps) {
  const authUser = showOrganizationSwitcher ? await requireManagementUser() : undefined;
  const repositoryContext = await getServerRepositoryContext({
    authorize: showOrganizationSwitcher
  });
  const organizationState =
    showOrganizationSwitcher && authUser
      ? await getAuthorizedOrganizationState(repositoryContext, authUser)
      : undefined;
  const organizationSlug =
    organizationState?.activeMembership?.organizationSlug ??
    repositoryContext.organizationSlug ??
    process.env.HEIMA_RATINGS_ORGANIZATION_SLUG ??
    "hema-ratings-demo";
  const organizationSource =
    organizationState?.activeMembership
      ? "成员授权"
      : repositoryContext.organizationId || repositoryContext.organizationSlug
      ? "请求上下文"
      : process.env.HEIMA_RATINGS_ORGANIZATION_SLUG
        ? "环境变量"
        : "默认组织";
  const organizations = showOrganizationSwitcher
    ? organizationState
      ? organizationState.memberships.map((membership) => ({
          id: membership.organizationId,
          name: `${membership.organizationName} · ${membership.role}`,
          slug: membership.organizationSlug
        }))
      : await getRepository(repositoryContext).listOrganizations()
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6 md:px-8">
      <header className="mb-8 rounded-[2rem] border border-white/10 bg-iron-950/70 p-4 shadow-blade backdrop-blur md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full md:w-[680px]">
            <h1 className="text-3xl font-black tracking-tight text-stone-50 md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-300 md:text-base">
              {description}
            </p>
          </div>
          <nav aria-label="主导航" className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Link
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-stone-300 transition hover:border-brass-500/50 hover:bg-brass-500/10 hover:text-brass-400"
                href={item.href}
                key={item.label}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {showOrganizationSwitcher ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-brass-400">
                Organization
              </p>
              <p className="mt-1 text-sm text-stone-300">
                当前组织：<span className="font-bold text-stone-50">{organizationSlug}</span>
                <span className="ml-2 text-xs text-stone-500">来源：{organizationSource}</span>
              </p>
              {authUser?.email ? (
                <p className="mt-1 text-xs text-stone-500">当前用户：{authUser.email}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={switchOrganization} className="flex flex-col gap-2 sm:flex-row">
                <select
                  className="min-h-10 rounded-xl border border-white/10 bg-iron-900 px-3 text-sm font-bold text-stone-100 outline-none focus:border-brass-500"
                  defaultValue={organizationSlug}
                  name="organizationSlug"
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.slug}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                <button
                  className="min-h-10 rounded-xl border border-brass-500/40 bg-brass-500/10 px-4 text-sm font-black text-brass-300 transition hover:border-brass-400 hover:bg-brass-500/20"
                  type="submit"
                >
                  切换组织
                </button>
              </form>
              <form action={signOut}>
                <button
                  className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-stone-300 transition hover:border-red-500/40 hover:text-red-200"
                  type="submit"
                >
                  退出
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </header>
      {children}
    </main>
  );
}

async function switchOrganization(formData: FormData) {
  "use server";

  let organizationSlug = String(formData.get("organizationSlug") ?? "").trim();
  if (!organizationSlug) {
    return;
  }

  if (isManagementAuthRequired()) {
    const user = await getCurrentAuthUser();
    if (!user) {
      return;
    }

    const state = await getAuthorizedOrganizationState({ organizationSlug }, user).catch(() => undefined);
    if (!state?.activeMembership) {
      return;
    }

    organizationSlug = state.activeMembership.organizationSlug;
  }

  const cookieStore = await cookies();
  cookieStore.set("heima_organization_slug", organizationSlug, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });
  cookieStore.delete("heima_organization_id");
  revalidatePath("/", "layout");
}
