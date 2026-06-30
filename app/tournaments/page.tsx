import { AppShell } from "@/components/layout/app-shell";
import { ActionLink } from "@/components/ui/action-link";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";
import { createTournamentAction, updateTournamentAction } from "@/lib/server/tournament-actions";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await (await getRequestRepository(await getServerRepositoryContext())).listTournaments();
  const primaryTournament = tournaments[0];

  return (
    <AppShell
      eyebrow="Events"
      title="赛事管理"
      description="一个赛事可以包含多个比赛项目，每个比赛项目绑定一个武器类型。当前页面展示赛事入口和状态。"
    >
      <Panel eyebrow="Create" title="新增赛事">
        <form action={createTournamentAction} className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            名称
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="name"
              placeholder="新赛事"
              required
            />
          </label>
          <TournamentFormatSelect />
          <TournamentStatusSelect />
          <RankingAlgorithmSelect />
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            开始时间
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="startedAt"
              type="datetime-local"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            结束时间
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="endedAt"
              type="datetime-local"
            />
          </label>
          <button
            className="self-end rounded-2xl bg-brass-400 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-brass-300"
            type="submit"
          >
            新增
          </button>
        </form>
      </Panel>

      <Panel
        action={
          primaryTournament ? (
            <ActionLink href={`/tournaments/${primaryTournament.id}`}>查看赛事</ActionLink>
          ) : null
        }
        eyebrow="Tournaments"
        title="赛事列表"
      >
        <DataTable
          columns={["赛事", "状态", "赛制", "项目/比赛", "编辑"]}
          rows={tournaments.map((tournament) => [
            <div className="grid gap-2" key="name">
              <span className="font-black text-stone-50">{tournament.name}</span>
              <ActionLink href={`/tournaments/${tournament.id}`}>查看赛事</ActionLink>
            </div>,
            <StatusBadge
              key="status"
              label={getStatusLabel(tournament.status)}
              tone={tournament.status === "active" ? "green" : "muted"}
            />,
            getFormatLabel(tournament.format),
            `${tournament.eventCount} / ${tournament.matchCount}`,
            <form
              action={updateTournamentAction}
              className="grid min-w-[760px] grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_1fr_auto] items-end gap-3"
              key="edit"
            >
              <input name="id" type="hidden" value={tournament.id} />
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                名称
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={tournament.name}
                  name="name"
                  required
                />
              </label>
              <TournamentFormatSelect defaultValue={tournament.format} compact />
              <TournamentStatusSelect defaultValue={tournament.status} compact />
              <RankingAlgorithmSelect defaultValue={tournament.defaultAlgorithm} compact />
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                开始
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={toDateTimeLocalValue(tournament.startedAt)}
                  name="startedAt"
                  type="datetime-local"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                结束
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={toDateTimeLocalValue(tournament.endedAt)}
                  name="endedAt"
                  type="datetime-local"
                />
              </label>
              <button
                className="h-10 rounded-2xl border border-brass-400/40 px-4 text-xs font-black text-brass-300 transition hover:border-brass-300 hover:text-brass-100"
                type="submit"
              >
                保存
              </button>
            </form>
          ])}
        />
      </Panel>
    </AppShell>
  );
}

function TournamentFormatSelect({
  defaultValue = "single_elimination",
  compact = false
}: {
  defaultValue?: string;
  compact?: boolean;
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

function TournamentStatusSelect({
  defaultValue = "draft",
  compact = false
}: {
  defaultValue?: string;
  compact?: boolean;
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

function RankingAlgorithmSelect({
  defaultValue = "hybrid",
  compact = false
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <label className={`grid ${compact ? "gap-1 text-xs" : "gap-2 text-sm"} font-bold text-stone-300`}>
      算法
      <select
        className={`${compact ? "h-10 text-sm" : "h-11"} rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400`}
        defaultValue={defaultValue}
        name="defaultAlgorithm"
      >
        <option value="hybrid">Hybrid</option>
        <option value="elo">Elo</option>
        <option value="sdr">SDR</option>
        <option value="glicko2">Glicko-2</option>
      </select>
    </label>
  );
}

function getStatusLabel(status: string) {
  return {
    active: "进行中",
    completed: "已完成",
    draft: "草稿"
  }[status] ?? status;
}

function getFormatLabel(format: string) {
  return {
    custom: "自定义",
    round_robin: "循环赛",
    single_elimination: "单败淘汰",
    swiss: "瑞士轮"
  }[format] ?? format;
}

function toDateTimeLocalValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}
