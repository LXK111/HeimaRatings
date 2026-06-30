import { AppShell } from "@/components/layout/app-shell";
import { EventRankingWorkbench } from "@/components/rankings/event-ranking-workbench";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface RankingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [page, events, players, weapons] = await Promise.all([
    repository.getPublicRankingPage("demo"),
    repository.listTournamentEvents(id),
    repository.listPlayers(),
    repository.listWeapons()
  ]);
  const enabledWeapons = page?.weapons.filter((weapon) => weapon.enabled) ?? [];

  return (
    <AppShell
      eyebrow="Rankings"
      title="排名榜"
      description="按赛事项目计算项目级排名，也可查看已发布的分武器公开榜单。"
    >
      <div className="grid gap-6">
        {events.length > 0 ? (
          <EventRankingWorkbench
            events={events}
            players={players}
            tournamentId={id}
            weapons={weapons}
          />
        ) : (
          <Panel title="暂无比赛项目">
            <p className="text-sm text-stone-400">当前赛事还没有可计算项目级排名的比赛项目。</p>
          </Panel>
        )}

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
