import Link from "next/link";
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
  children: React.ReactNode;
}

export function AppShell({ eyebrow = "HEMA Ratings", title, description, children }: AppShellProps) {
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
      </header>
      {children}
    </main>
  );
}
