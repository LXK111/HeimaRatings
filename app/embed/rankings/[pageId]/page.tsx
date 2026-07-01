import type { Metadata } from "next";
import { RankingBoard } from "@/components/rankings/ranking-board";
import type { PublicPageTheme, PublicRankingPagePayload, WeaponType } from "@/lib/domain/types";
import { getRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

interface EmbedRankingPageProps {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ height?: string; theme?: string; weapon?: string }>;
}

export const metadata: Metadata = {
  title: "HEMA Ratings Embed",
  robots: {
    index: false,
    follow: false
  }
};

export default async function EmbedRankingPage({ params, searchParams }: EmbedRankingPageProps) {
  const { pageId } = await params;
  const query = await searchParams;
  const repository = getRepository(await getServerRepositoryContext({ authorize: false }));
  const page = await repository.getPublicRankingPage(pageId);
  const theme = resolveTheme(query.theme, page?.theme ?? "dark");
  const height = resolveEmbedHeight(query.height);
  const shellClass = getEmbedShellClass(theme);
  const panelClass = getEmbedPanelClass(theme, height);

  if (!page || !page.enabled) {
    return (
      <main className={shellClass}>
        <section className={panelClass}>
          <p className="text-sm font-semibold">榜单不可用</p>
        </section>
      </main>
    );
  }

  const weapon = resolveWeapon(page, query.weapon);
  const rows = page.rankingsByWeapon[weapon.id] ?? [];

  return (
    <main className={shellClass}>
      <section className={panelClass}>
        {theme === "compact" ? null : (
          <p className="mb-4 text-xs font-black uppercase tracking-[0.32em] text-brass-400">
            HEMA Ratings Embed
          </p>
        )}
        {rows.length > 0 ? (
          <RankingBoard compact={theme === "compact"} weapon={weapon} rows={rows} />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-stone-400">
            {weapon.name} 暂无公开排名数据。
          </div>
        )}
      </section>
    </main>
  );
}

function resolveWeapon(page: PublicRankingPagePayload, weaponId?: string): WeaponType {
  return (
    page.weapons.find((weapon) => weapon.id === weaponId) ??
    page.weapons.find((weapon) => weapon.id === page.defaultWeaponTypeId) ??
    page.weapons[0]
  );
}

function resolveTheme(theme: string | undefined, fallback: PublicPageTheme): PublicPageTheme {
  if (theme === "dark" || theme === "light" || theme === "compact") {
    return theme;
  }

  return fallback;
}

function resolveEmbedHeight(height: string | undefined) {
  const parsed = Number(height);
  if ([480, 640, 800].includes(parsed)) {
    return parsed;
  }

  return 640;
}

function getEmbedShellClass(theme: PublicPageTheme) {
  if (theme === "light") {
    return "min-h-screen bg-stone-100 p-4 text-iron-950";
  }
  if (theme === "compact") {
    return "min-h-screen bg-iron-950 p-2 text-stone-50";
  }

  return "min-h-screen bg-iron-950 p-4 text-stone-50";
}

function getEmbedPanelClass(theme: PublicPageTheme, height: number) {
  const heightClass = height === 480 ? "min-h-[440px]" : height === 800 ? "min-h-[760px]" : "min-h-[600px]";
  if (theme === "light") {
    return `${heightClass} rounded-2xl border border-stone-300 bg-white p-4 text-iron-950`;
  }
  if (theme === "compact") {
    return `${heightClass} rounded-xl border border-white/10 bg-white/[0.035] p-3`;
  }

  return `${heightClass} rounded-2xl border border-white/10 bg-white/[0.04] p-4`;
}
