import { AppShell } from "@/components/layout/app-shell";
import { ActionLink } from "@/components/ui/action-link";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  PlayerSummary,
  TournamentEventEntrySummary,
  TournamentEventSummary,
  WeaponType
} from "@/lib/domain/types";
import { createTournamentEventEntryAction } from "@/lib/server/tournament-event-entry-actions";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface TournamentEntriesPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentEntriesPage({ params }: TournamentEntriesPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [tournament, events, players, weapons] = await Promise.all([
    repository.getTournament(id),
    repository.listTournamentEvents(id),
    repository.listPlayers(),
    repository.listWeapons()
  ]).catch((error) => {
    if (isMissingCurrentOrganizationTournament(error)) {
      return [undefined, [], [], []] as const;
    }
    throw error;
  });

  if (!tournament) {
    return (
      <AppShell
        eyebrow="Tournament Entries"
        title="参赛名单不可用"
        description="当前组织下找不到这个赛事，可能是测试数据已清理，或旧链接仍指向其他组织的赛事。"
      >
        <Panel action={<ActionLink href="/tournaments">返回赛事列表</ActionLink>} title="未找到赛事">
          <p className="text-sm leading-7 text-stone-400">请从赛事列表选择当前组织里的赛事。</p>
        </Panel>
      </AppShell>
    );
  }

  const entriesByEvent = await loadEntriesByEvent(id, events);
  const rows = buildEntryRows(events, entriesByEvent, players, weapons);

  return (
    <AppShell
      eyebrow="Tournament Entries"
      title={`${tournament.name} · 参赛名单`}
      description="赛事参赛名单按比赛项目汇总展示，新增参赛选手时需要选择所属比赛项目。"
    >
      {events.length > 0 ? (
        <Panel title="新增参赛选手">
          <form action={createTournamentEventEntryAction} className="grid gap-4 md:grid-cols-[1fr_1.2fr_0.6fr_auto]">
            <input name="tournamentId" type="hidden" value={id} />
            <EventSelect events={events} weapons={weapons} />
            <PlayerSelect players={players} />
            <label className="grid gap-2 text-sm font-bold text-stone-300">
              种子
              <input
                className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
                min="1"
                name="seed"
                placeholder="可选"
                type="number"
              />
            </label>
            <button
              className="self-end rounded-2xl bg-brass-400 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-brass-300"
              disabled={players.length === 0}
              type="submit"
            >
              新增
            </button>
          </form>
        </Panel>
      ) : (
        <Panel action={<ActionLink href={`/tournaments/${id}`}>创建比赛项目</ActionLink>} title="请先创建比赛项目">
          <p className="text-sm leading-7 text-stone-400">
            参赛名单需要挂到具体比赛项目。请先在赛事详情页根据武器类型创建项目。
          </p>
        </Panel>
      )}

      <Panel className="mt-6" title="参赛选手">
        {rows.length > 0 ? (
          <DataTable
            columns={["选手", "俱乐部", "比赛项目", "武器", "积分", "积分排名", "状态"]}
            rows={rows.map((row) => [
              <span className="font-black text-stone-50" key="player">{row.playerName}</span>,
              row.club,
              row.eventName,
              <StatusBadge key="weapon" label={row.weaponName} tone="brass" />,
              row.rating,
              row.rank,
              <StatusBadge
                key="status"
                label={row.status === "registered" ? "已报名" : "已退赛"}
                tone={row.status === "registered" ? "green" : "muted"}
              />
            ])}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-iron-950/50 p-5">
            <p className="text-sm font-bold text-stone-300">暂无参赛选手</p>
            <p className="mt-2 text-sm leading-7 text-stone-500">
              使用上方“新增参赛选手”表单，将选手加入某个比赛项目。
            </p>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

async function loadEntriesByEvent(tournamentId: string, events: TournamentEventSummary[]) {
  const repository = await getRequestRepository(await getServerRepositoryContext());
  return Object.fromEntries(
    await Promise.all(
      events.map(async (event) => [
        event.id,
        await repository.listTournamentEventEntries(tournamentId, event.id)
      ])
    )
  ) as Record<string, TournamentEventEntrySummary[]>;
}

function buildEntryRows(
  events: TournamentEventSummary[],
  entriesByEvent: Record<string, TournamentEventEntrySummary[]>,
  players: PlayerSummary[],
  weapons: WeaponType[]
) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const weaponsById = new Map(weapons.map((weapon) => [weapon.id, weapon]));

  return events.flatMap((event) => {
    const weapon = weaponsById.get(event.weaponTypeId);
    return (entriesByEvent[event.id] ?? []).map((entry) => {
      const player = playersById.get(entry.playerId);
      const rating = player?.weaponRatings.find((item) => item.weaponTypeId === event.weaponTypeId);
      return {
        playerName: entry.playerName,
        club: entry.playerClub,
        eventName: event.name,
        weaponName: weapon?.name ?? "未知武器",
        rating: rating ? String(rating.rating) : "未建档",
        rank: rating ? String(rating.rank) : "未排名",
        status: entry.status
      };
    });
  });
}

function EventSelect({ events, weapons }: { events: TournamentEventSummary[]; weapons: WeaponType[] }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-stone-300">
      比赛项目
      <select
        className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
        name="eventId"
        required
      >
        {events.map((event) => {
          const weapon = weapons.find((item) => item.id === event.weaponTypeId);
          return (
            <option key={event.id} value={event.id}>
              {event.name} · {weapon?.name ?? "未知武器"}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function PlayerSelect({ players }: { players: PlayerSummary[] }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-stone-300">
      选手
      <select
        className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={players.length === 0}
        name="playerId"
        required
      >
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name} · {player.club}
          </option>
        ))}
      </select>
    </label>
  );
}

function isMissingCurrentOrganizationTournament(error: unknown) {
  return error instanceof Error && error.message === "Tournament not found in current organization";
}
