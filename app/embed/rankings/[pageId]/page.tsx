import { RankingBoard } from "@/components/rankings/ranking-board";
import type { PublicRankingPagePayload, WeaponType } from "@/lib/domain/types";
import { getPublicRankingPage } from "@/lib/server/mock-repository";

interface EmbedRankingPageProps {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ weapon?: string }>;
}

export default async function EmbedRankingPage({ params, searchParams }: EmbedRankingPageProps) {
  const { pageId } = await params;
  const query = await searchParams;
  const page = getPublicRankingPage(pageId);

  if (!page || !page.enabled) {
    return (
      <main className="min-h-screen bg-iron-950 p-4 text-stone-50">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-semibold text-stone-300">榜单不可用</p>
        </section>
      </main>
    );
  }

  const weapon = resolveWeapon(page, query.weapon);
  const rows = page.rankingsByWeapon[weapon.id] ?? [];

  return (
    <main className="min-h-screen bg-iron-950 p-4 text-stone-50">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.32em] text-brass-400">
          HEMA Ratings Embed
        </p>
        {rows.length > 0 ? (
          <RankingBoard compact weapon={weapon} rows={rows} />
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 p-5 text-sm text-stone-400">
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
