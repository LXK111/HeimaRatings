import { AppShell } from "@/components/layout/app-shell";
import { ActionLink } from "@/components/ui/action-link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LifecycleStatus, TournamentFormat, WeaponType } from "@/lib/domain/types";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";
import {
  createTournamentEventAction,
  updateTournamentEventAction
} from "@/lib/server/tournament-event-actions";

export const dynamic = "force-dynamic";

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [tournament, tournamentEvents, matches, weaponTypes] = await Promise.all([
    repository.getTournament(id),
    repository.listTournamentEvents(id),
    repository.listTournamentMatches(id),
    repository.listWeapons()
  ]);

  if (!tournament) {
    return (
      <AppShell
        eyebrow="Tournament Detail"
        title="赛事不存在"
        description="请检查赛事链接是否正确。"
      >
        <Panel title="无法找到赛事">
          <p className="text-sm text-stone-400">当前数据源中没有找到该赛事。</p>
        </Panel>
      </AppShell>
    );
  }

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

      <Panel className="mt-6" title="新增比赛项目">
        <form action={createTournamentEventAction} className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
          <input name="tournamentId" type="hidden" value={id} />
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            项目名称
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="name"
              placeholder="长剑公开组"
              required
            />
          </label>
          <WeaponSelect weaponTypes={weaponTypes} />
          <TournamentFormatSelect />
          <EventStatusSelect />
          <button
            className="self-end rounded-2xl bg-brass-400 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-brass-300"
            type="submit"
          >
            新增
          </button>
        </form>
      </Panel>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        {tournamentEvents.map((event) => {
          const weapon = weaponTypes.find((item) => item.id === event.weaponTypeId);
          return (
            <Panel
              action={<ActionLink href={`/tournaments/${id}/matches?eventId=${event.id}`}>进入录入</ActionLink>}
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
              <form
                action={updateTournamentEventAction}
                className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto]"
              >
                <input name="tournamentId" type="hidden" value={id} />
                <input name="id" type="hidden" value={event.id} />
                <label className="grid gap-1 text-xs font-bold text-stone-400">
                  项目名称
                  <input
                    className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                    defaultValue={event.name}
                    name="name"
                    required
                  />
                </label>
                <WeaponSelect defaultValue={event.weaponTypeId} weaponTypes={weaponTypes} compact />
                <TournamentFormatSelect defaultValue={event.format} compact />
                <EventStatusSelect defaultValue={event.status} compact />
                <button
                  className="h-10 self-end rounded-2xl border border-brass-400/40 px-4 text-xs font-black text-brass-300 transition hover:border-brass-300 hover:text-brass-100"
                  type="submit"
                >
                  保存
                </button>
              </form>
            </Panel>
          );
        })}
        {tournamentEvents.length === 0 ? (
          <Panel title="暂无比赛项目">
            <p className="text-sm leading-7 text-stone-400">
              请先根据已有武器类型创建比赛项目，再进入项目录入比赛。
            </p>
          </Panel>
        ) : null}
      </section>

      <Panel
        action={<ActionLink href={`/tournaments/${id}/rankings`}>查看排名</ActionLink>}
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

function WeaponSelect({
  compact = false,
  defaultValue,
  weaponTypes
}: {
  compact?: boolean;
  defaultValue?: string;
  weaponTypes: WeaponType[];
}) {
  return (
    <label className={`grid ${compact ? "gap-1 text-xs" : "gap-2 text-sm"} font-bold text-stone-300`}>
      武器类型
      <select
        className={`${compact ? "h-10 text-sm" : "h-11"} rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400`}
        defaultValue={defaultValue ?? weaponTypes[0]?.id}
        name="weaponTypeId"
        required
      >
        {weaponTypes.map((weapon) => (
          <option key={weapon.id} value={weapon.id}>
            {weapon.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TournamentFormatSelect({
  compact = false,
  defaultValue = "single_elimination"
}: {
  compact?: boolean;
  defaultValue?: TournamentFormat;
}) {
  return (
    <label className={`grid ${compact ? "gap-1 text-xs" : "gap-2 text-sm"} font-bold text-stone-300`}>
      赛制
      <select
        className={`${compact ? "h-10 text-sm" : "h-11"} rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400`}
        defaultValue={defaultValue}
        name="format"
      >
        <option value="single_elimination">单败淘汰</option>
        <option value="round_robin">循环赛</option>
        <option value="swiss">瑞士轮</option>
        <option value="custom">自定义</option>
      </select>
    </label>
  );
}

function EventStatusSelect({
  compact = false,
  defaultValue = "active"
}: {
  compact?: boolean;
  defaultValue?: LifecycleStatus;
}) {
  return (
    <label className={`grid ${compact ? "gap-1 text-xs" : "gap-2 text-sm"} font-bold text-stone-300`}>
      状态
      <select
        className={`${compact ? "h-10 text-sm" : "h-11"} rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400`}
        defaultValue={defaultValue}
        name="status"
      >
        <option value="draft">草稿</option>
        <option value="active">进行中</option>
        <option value="completed">已完成</option>
      </select>
    </label>
  );
}
