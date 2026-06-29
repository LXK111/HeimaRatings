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
import { StatusBadge } from "@/components/ui/status-badge";
import { getRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

const navigationItems = [
  { href: "/", label: "控制台", icon: Home },
  { href: "/weapons", label: "武器类型", icon: Swords },
  { href: "/players", label: "选手", icon: UsersRound },
  { href: "/tournaments", label: "赛事", icon: Trophy },
  { href: "/tournaments/demo/events", label: "比赛项目", icon: ListChecks },
  { href: "/tournaments/demo/rankings", label: "排名榜", icon: BarChart3 },
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
  eyebrow = "HEMA Ratings",
  title,
  description,
  showOrganizationSwitcher = true,
  children
}: AppShellProps) {
  const repositoryContext = await getServerRepositoryContext();
  const organizationSlug =
    repositoryContext.organizationSlug ??
    process.env.HEIMA_RATINGS_ORGANIZATION_SLUG ??
    "hema-ratings-demo";
  const organizationSource =
    repositoryContext.organizationId || repositoryContext.organizationSlug
      ? "请求上下文"
      : process.env.HEIMA_RATINGS_ORGANIZATION_SLUG
        ? "环境变量"
        : "默认组织";
  const organizations = showOrganizationSwitcher
    ? await getRepository(repositoryContext).listOrganizations()
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6 md:px-8">
      <header className="mb-8 rounded-[2rem] border border-white/10 bg-iron-950/70 p-4 shadow-blade backdrop-blur md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge label="Phase 2" tone="brass" />
              <StatusBadge label={eyebrow} tone="muted" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-stone-50 md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300 md:text-base">
              {description}
            </p>
          </div>
          <nav aria-label="主导航" className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Link
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-stone-300 transition hover:border-brass-500/50 hover:bg-brass-500/10 hover:text-brass-400"
                href={item.href}
                key={item.href}
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
            </div>
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
          </div>
        ) : null}
      </header>
      {children}
    </main>
  );
}

async function switchOrganization(formData: FormData) {
  "use server";

  const organizationSlug = String(formData.get("organizationSlug") ?? "").trim();
  if (!organizationSlug) {
    return;
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
