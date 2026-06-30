import { AppShell } from "@/components/layout/app-shell";
import { RankingResultTable } from "@/components/matches/ranking-result-table";
import { EventRankingWorkbench } from "@/components/rankings/event-ranking-workbench";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface RankingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [page, events, players, weapons, eventSnapshots] = await Promise.all([
    repository.getPublicRankingPage("demo"),
    repository.listTournamentEvents(id),
    repository.listPlayers(),
    repository.listWeapons(),
    repository.listTournamentEventRankingSnapshots(id)
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

        <section className="grid gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-brass-400">
              Event Snapshots
            </p>
            <h2 className="mt-2 text-2xl font-black text-stone-50">最近项目榜</h2>
          </div>
          {eventSnapshots.map((snapshot) => {
            const weapon = weapons.find((item) => item.id === snapshot.weaponTypeId);
            return (
              <Panel
                action={<StatusBadge label={snapshot.id} tone="muted" />}
                key={snapshot.id}
                title={snapshot.eventName}
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <StatusBadge label={weapon?.name ?? "未知武器"} tone="brass" />
                  <StatusBadge label={snapshot.algorithm.toUpperCase()} tone="muted" />
                  <StatusBadge
                    label={`生成于 ${new Date(snapshot.generatedAt).toLocaleString()}`}
                    tone="green"
                  />
                </div>
                <RankingResultTable rows={snapshot.items} />
              </Panel>
            );
          })}
          {eventSnapshots.length === 0 ? (
            <Panel title="暂无项目快照">
              <p className="text-sm text-stone-400">保存项目级排名快照后，会在这里展示最近项目榜。</p>
            </Panel>
          ) : null}
        </section>

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
