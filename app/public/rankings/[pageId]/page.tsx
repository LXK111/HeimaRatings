import { AppShell } from "@/components/layout/app-shell";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { rankingsByWeapon, weaponTypes } from "@/lib/mock/dashboard-data";

export default function PublicRankingPage() {
  const weapon = weaponTypes[0];

  return (
    <AppShell
      eyebrow="Public Ranking"
      title="HEMA 春季积分赛公开榜单"
      description="公开页面面向外部访问者，只读展示指定武器类型的排名结果。后续支持武器切换和公开配置。"
    >
      <Panel>
        <RankingBoard weapon={weapon} rows={rankingsByWeapon[weapon.id] ?? []} />
      </Panel>
    </AppShell>
  );
}
