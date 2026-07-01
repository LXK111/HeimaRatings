import { AppShell } from "@/components/layout/app-shell";
import { RankingResultTable } from "@/components/matches/ranking-result-table";
import { EventRankingWorkbench } from "@/components/rankings/event-ranking-workbench";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicRankingPageSummary } from "@/lib/domain/types";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface RankingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [publicPages, events, players, weapons, eventSnapshots] = await Promise.all([
    repository.listPublicRankingPages(),
    repository.listTournamentEvents(id),
    repository.listPlayers(),
    repository.listWeapons(),
    repository.listTournamentEventRankingSnapshots(id)
  ]);
  const page = publicPages[0]
    ? await repository.getPublicRankingPage(publicPages[0].pageId)
    : await repository.getPublicRankingPage("demo");
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

        <PublicPagePublishPanel publicPages={publicPages} />

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

function PublicPagePublishPanel({ publicPages }: { publicPages: PublicRankingPageSummary[] }) {
  return (
    <section className="grid gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.32em] text-brass-400">
          Public Pages
        </p>
        <h2 className="mt-2 text-2xl font-black text-stone-50">公开页发布入口</h2>
      </div>
      {publicPages.length > 0 ? (
        <div className="grid gap-4">
          {publicPages.map((page) => {
            const publicUrl = `/public/rankings/${page.pageId}`;
            const embedUrl = `/embed/rankings/${page.pageId}?theme=${page.theme}&height=640`;
            const iframeCode = `<iframe src="${embedUrl}" title="${page.title}" width="100%" height="640" style="border:0;border-radius:16px;"></iframe>`;

            return (
              <Panel
                action={<StatusBadge label={page.enabled ? "已启用" : "已关闭"} tone={page.enabled ? "green" : "muted"} />}
                key={page.pageId}
                title={page.title}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-stone-500">
                      Public URL
                    </p>
                    <p className="mt-2 break-all rounded-2xl border border-white/10 bg-iron-950/60 p-3 text-sm font-semibold text-stone-200">
                      {publicUrl}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-stone-500">
                      Embed Code
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-iron-950/60 p-3 text-xs font-semibold text-brass-100">
                      <code>{iframeCode}</code>
                    </pre>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge label={`pageId: ${page.pageId}`} tone="muted" />
                  <StatusBadge label={`theme: ${page.theme}`} tone="brass" />
                  {page.updatedAt ? (
                    <StatusBadge label={`更新于 ${new Date(page.updatedAt).toLocaleString()}`} tone="green" />
                  ) : null}
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel title="暂无公开页">
          <p className="text-sm text-stone-400">当前组织还没有可发布的公开页。</p>
        </Panel>
      )}
    </section>
  );
}
