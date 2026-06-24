import { AppShell } from "@/components/layout/app-shell";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { rankingsByWeapon, weaponTypes } from "@/lib/mock/dashboard-data";

export default function RankingsPage() {
  const enabledWeapons = weaponTypes.filter((weapon) => weapon.enabled);

  return (
    <AppShell
      eyebrow="Rankings"
      title="分武器排名榜"
      description="排名榜支持按武器类型切换积分池。阶段 2 先并排展示多个武器榜单，后续接入交互筛选和 Ranking Engine。"
    >
      <div className="grid gap-6">
        {enabledWeapons.map((weapon) => (
          <Panel key={weapon.id}>
            <RankingBoard weapon={weapon} rows={rankingsByWeapon[weapon.id] ?? []} />
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
