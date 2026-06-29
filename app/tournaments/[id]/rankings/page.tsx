import { AppShell } from "@/components/layout/app-shell";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { getRepository } from "@/lib/server/repositories/factory";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const repository = getRepository();
  const page = await repository.getPublicRankingPage("demo");
  const enabledWeapons = page?.weapons.filter((weapon) => weapon.enabled) ?? [];

  return (
    <AppShell
      eyebrow="Rankings"
      title="分武器排名榜"
      description="排名榜按武器类型展示当前已发布的排名快照。"
    >
      <div className="grid gap-6">
        {enabledWeapons.map((weapon) => (
          <Panel key={weapon.id}>
            <RankingBoard weapon={weapon} rows={page?.rankingsByWeapon[weapon.id] ?? []} />
          </Panel>
        ))}
        {enabledWeapons.length === 0 ? (
          <Panel title="暂无排名">
            <p className="text-sm text-stone-400">当前公开页还没有可展示的排名快照。</p>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
