import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
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
  const [tournamentEvents, weaponTypes] = await Promise.all([
    repository.listTournamentEvents(id),
    repository.listWeapons()
  ]);

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
          columns={["项目", "武器", "赛制", "状态", "比赛数", "编辑"]}
          rows={tournamentEvents.map((event) => {
            const weapon = weaponTypes.find((item) => item.id === event.weaponTypeId);
            return [
              <span className="font-black text-stone-50" key="name">{event.name}</span>,
              <StatusBadge key="weapon" label={weapon?.name ?? "未知武器"} tone="brass" />,
              event.format,
              <StatusBadge
                key="status"
                label={event.status === "active" ? "进行中" : "草稿"}
                tone={event.status === "active" ? "green" : "muted"}
              />,
              event.matchCount,
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
