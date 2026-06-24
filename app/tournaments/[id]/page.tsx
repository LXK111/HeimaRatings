import { AppShell } from "@/components/layout/app-shell";
import { ActionLink } from "@/components/ui/action-link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { matches, tournamentEvents, tournaments, weaponTypes } from "@/lib/mock/dashboard-data";

export default function TournamentDetailPage() {
  const tournament = tournaments[0];

  return (
    <AppShell
      eyebrow="Tournament Detail"
      title={tournament.name}
      description="赛事详情聚合比赛项目、比赛录入和分武器排名入口。阶段 2 先确认页面信息架构。"
    >
      <section className="grid gap-5 lg:grid-cols-3">
        <Panel title="赛事状态">
          <div className="space-y-4">
            <StatusBadge label="进行中" tone="green" />
            <p className="text-4xl font-black text-stone-50">{tournament.matchCount}</p>
            <p className="text-sm text-stone-400">已登记比赛记录</p>
          </div>
        </Panel>
        <Panel title="项目数量">
          <p className="text-4xl font-black text-stone-50">{tournament.eventCount}</p>
          <p className="mt-4 text-sm text-stone-400">每个项目绑定独立武器类型。</p>
        </Panel>
        <Panel title="默认算法">
          <p className="text-4xl font-black uppercase text-brass-400">
            {tournament.defaultAlgorithm}
          </p>
          <p className="mt-4 text-sm text-stone-400">后续支持按项目或武器切换。</p>
        </Panel>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        {tournamentEvents.map((event) => {
          const weapon = weaponTypes.find((item) => item.id === event.weaponTypeId);
          return (
            <Panel
              action={<ActionLink href="/tournaments/demo/matches">录入比赛</ActionLink>}
              key={event.id}
              title={event.name}
            >
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={weapon?.name ?? "未知武器"} tone="brass" />
                <StatusBadge
                  label={event.status === "active" ? "进行中" : "草稿"}
                  tone={event.status === "active" ? "green" : "muted"}
                />
              </div>
              <p className="mt-5 text-3xl font-black text-stone-50">{event.matchCount}</p>
              <p className="mt-2 text-sm text-stone-400">项目比赛数</p>
            </Panel>
          );
        })}
      </section>

      <Panel
        action={<ActionLink href="/tournaments/demo/rankings">查看排名</ActionLink>}
        className="mt-6"
        title="最近比赛"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {matches.map((match) => (
            <div className="rounded-2xl border border-white/10 bg-iron-950/40 p-4" key={match.id}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
                Round {match.round}
              </p>
              <p className="mt-3 font-black text-stone-50">
                {match.player1Name} {match.score1}:{match.score2} {match.player2Name}
              </p>
              <p className="mt-2 text-sm text-brass-400">胜者：{match.winnerName}</p>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
