import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TournamentEventEntrySummary } from "@/lib/domain/types";
import { generateTournamentEventBracketAction } from "@/lib/server/bracket-actions";
import {
  createTournamentEventEntryAction,
  updateTournamentEventEntryAction
} from "@/lib/server/tournament-event-entry-actions";
import { createTournamentEventAction, updateTournamentEventAction } from "@/lib/server/tournament-event-actions";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface TournamentEventsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentEventsPage({ params }: TournamentEventsPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [tournamentEvents, weaponTypes, players] = await Promise.all([
    repository.listTournamentEvents(id),
    repository.listWeapons(),
    repository.listPlayers()
  ]);
  const entriesByEvent: Record<string, TournamentEventEntrySummary[]> = Object.fromEntries(
    await Promise.all(
      tournamentEvents.map(async (event) => [
        event.id,
        await repository.listTournamentEventEntries(id, event.id)
      ])
    )
  );

  return (
    <AppShell
      eyebrow="Tournament Events"
      title="比赛项目管理"
      description="同一赛事下可以创建多个比赛项目，例如长剑公开组、军刀公开组。每个项目绑定一个武器类型。"
    >
      <Panel eyebrow="Create" title="新增比赛项目">
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

      <Panel eyebrow="Events" title="项目列表">
        <DataTable
          columns={["项目", "武器", "赛制", "状态", "比赛数", "参赛名单", "编辑"]}
          rows={tournamentEvents.map((event) => {
            const weapon = weaponTypes.find((item) => item.id === event.weaponTypeId);
            const entries = entriesByEvent[event.id] ?? [];
            const registeredEntries = entries.filter((entry) => entry.status === "registered");
            return [
              <span className="font-black text-stone-50" key="name">{event.name}</span>,
              <StatusBadge key="weapon" label={weapon?.name ?? "未知武器"} tone="brass" />,
              event.format,
              <StatusBadge
                key="status"
                label={event.status === "active" ? "进行中" : "草稿"}
                tone={event.status === "active" ? "green" : "muted"}
              />,
              <BracketGenerateForm
                eventId={event.id}
                eventFormat={event.format}
                matchCount={event.matchCount}
                registeredCount={registeredEntries.length}
                tournamentId={id}
                key="bracket"
              />,
              <div className="grid min-w-[520px] gap-4" key="entries">
                <AddEntryForm entries={entries} eventId={event.id} players={players} tournamentId={id} />
                <EntryList entries={entries} eventId={event.id} tournamentId={id} />
              </div>,
              <form
                action={updateTournamentEventAction}
                className="grid min-w-[560px] grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] items-end gap-3"
                key="edit"
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
                  className="h-10 rounded-2xl border border-brass-400/40 px-4 text-xs font-black text-brass-300 transition hover:border-brass-300 hover:text-brass-100"
                  type="submit"
                >
                  保存
                </button>
              </form>
            ];
          })}
        />
      </Panel>
    </AppShell>
  );
}

function BracketGenerateForm({
  eventFormat,
  eventId,
  matchCount,
  registeredCount,
  tournamentId
}: {
  eventFormat: string;
  eventId: string;
  matchCount: number;
  registeredCount: number;
  tournamentId: string;
}) {
  const reason = getBracketUnavailableReason(eventFormat, matchCount, registeredCount);
  return (
    <form action={generateTournamentEventBracketAction} className="grid min-w-[180px] gap-2">
      <input name="tournamentId" type="hidden" value={tournamentId} />
      <input name="eventId" type="hidden" value={eventId} />
      <div className="text-xs font-bold text-stone-400">
        {matchCount > 0 ? `${matchCount} 场已生成` : `${registeredCount} 人可生成`}
      </div>
      <button
        className="h-10 rounded-2xl border border-brass-400/40 px-4 text-xs font-black text-brass-300 transition hover:border-brass-300 hover:text-brass-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={Boolean(reason)}
        type="submit"
      >
        生成签表
      </button>
      {reason ? <span className="text-xs font-bold text-stone-500">{reason}</span> : null}
    </form>
  );
}

function getBracketUnavailableReason(eventFormat: string, matchCount: number, registeredCount: number) {
  if (matchCount > 0) {
    return "已有对阵";
  }
  if (registeredCount < 2) {
    return "参赛少于 2 人";
  }
  if (eventFormat !== "single_elimination" && eventFormat !== "round_robin") {
    return "暂不支持该赛制";
  }

  return undefined;
}

function AddEntryForm({
  entries,
  eventId,
  players,
  tournamentId
}: {
  entries: Array<{ playerId: string }>;
  eventId: string;
  players: Array<{ id: string; name: string; club: string }>;
  tournamentId: string;
}) {
  const enteredPlayerIds = new Set(entries.map((entry) => entry.playerId));
  const availablePlayers = players.filter((player) => !enteredPlayerIds.has(player.id));
  const hasAvailablePlayers = availablePlayers.length > 0;

  return (
    <form action={createTournamentEventEntryAction} className="grid grid-cols-[1fr_84px_auto] items-end gap-2">
      <input name="tournamentId" type="hidden" value={tournamentId} />
      <input name="eventId" type="hidden" value={eventId} />
      <label className="grid gap-1 text-xs font-bold text-stone-400">
        加入选手
        <select
          className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
          disabled={!hasAvailablePlayers}
          name="playerId"
          required
        >
          {availablePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} · {player.club}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold text-stone-400">
        种子
        <input
          className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
          min="1"
          name="seed"
          type="number"
        />
      </label>
      <button
        className="h-10 rounded-2xl border border-brass-400/40 px-4 text-xs font-black text-brass-300 transition hover:border-brass-300 hover:text-brass-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasAvailablePlayers}
        type="submit"
      >
        加入
      </button>
    </form>
  );
}

function EntryList({
  entries,
  eventId,
  tournamentId
}: {
  entries: Array<{
    id: string;
    playerName: string;
    playerClub: string;
    seed?: number;
    status: string;
  }>;
  eventId: string;
  tournamentId: string;
}) {
  if (entries.length === 0) {
    return <span className="text-xs font-bold text-stone-500">暂无参赛选手</span>;
  }

  return (
    <div className="grid gap-2">
      {entries.map((entry) => (
        <form
          action={updateTournamentEventEntryAction}
          className="grid grid-cols-[1fr_72px_108px_auto] items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2"
          key={entry.id}
        >
          <input name="tournamentId" type="hidden" value={tournamentId} />
          <input name="eventId" type="hidden" value={eventId} />
          <input name="id" type="hidden" value={entry.id} />
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-stone-100">{entry.playerName}</div>
            <div className="truncate text-xs font-bold text-stone-500">{entry.playerClub}</div>
          </div>
          <label className="grid gap-1 text-xs font-bold text-stone-400">
            种子
            <input
              className="h-9 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
              defaultValue={entry.seed}
              min="1"
              name="seed"
              type="number"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-stone-400">
            状态
            <select
              className="h-9 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
              defaultValue={entry.status}
              name="status"
            >
              <option value="registered">参赛</option>
              <option value="withdrawn">退赛</option>
            </select>
          </label>
          <button
            className="h-9 rounded-2xl border border-brass-400/40 px-3 text-xs font-black text-brass-300 transition hover:border-brass-300 hover:text-brass-100"
            type="submit"
          >
            保存
          </button>
        </form>
      ))}
    </div>
  );
}

function WeaponSelect({
  weaponTypes,
  defaultValue,
  compact = false
}: {
  weaponTypes: Array<{ id: string; name: string; enabled: boolean }>;
  defaultValue?: string;
  compact?: boolean;
}) {
  const availableWeapons = weaponTypes.filter((weapon) => weapon.enabled || weapon.id === defaultValue);
  return (
    <label className={`grid ${compact ? "gap-1 text-xs" : "gap-2 text-sm"} font-bold text-stone-300`}>
      武器
      <select
        className={`${compact ? "h-10 text-sm" : "h-11"} rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400`}
        defaultValue={defaultValue ?? availableWeapons[0]?.id}
        name="weaponTypeId"
      >
        {availableWeapons.map((weapon) => (
          <option key={weapon.id} value={weapon.id}>
            {weapon.name}
          </option>
        ))}
      </select>
    </label>
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

function EventStatusSelect({
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
