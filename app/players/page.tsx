import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { createPlayerAction, updatePlayerAction } from "@/lib/server/player-actions";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [players, weaponTypes] = await Promise.all([
    repository.listPlayers(),
    repository.listWeapons()
  ]);

  return (
    <AppShell
      eyebrow="Roster"
      title="选手管理"
      description="展示选手基础信息和分武器积分摘要。当前页面通过 Repository 数据源读取选手与武器积分。"
    >
      <Panel eyebrow="Create" title="新增选手">
        <form action={createPlayerAction} className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.7fr_auto]">
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            姓名
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="name"
              placeholder="新选手"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            俱乐部
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="club"
              placeholder="未知俱乐部"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            初始积分
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              min="0"
              name="initialRating"
              placeholder="1500"
              step="0.01"
              type="number"
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

      <Panel eyebrow="Fighters" title="选手名册">
        <DataTable
          columns={["选手", "俱乐部", "分武器积分", "编辑"]}
          rows={players.map((player) => [
            <span className="font-black text-stone-50" key="name">{player.name}</span>,
            player.club,
            <div className="flex flex-wrap gap-2" key="ratings">
              {player.weaponRatings.map((rating) => {
                const weapon = weaponTypes.find((item) => item.id === rating.weaponTypeId);
                return (
                  <span
                    className="rounded-full border border-brass-500/30 bg-brass-500/10 px-3 py-1 text-xs font-bold text-brass-400"
                    key={`${player.id}-${rating.weaponTypeId}`}
                  >
                    {weapon?.name ?? "未知"} #{rating.rank} · {rating.rating}
                  </span>
                );
              })}
            </div>,
            <form
              action={updatePlayerAction}
              className="grid min-w-[360px] grid-cols-[1fr_1fr_auto] items-end gap-3"
              key="edit"
            >
              <input name="id" type="hidden" value={player.id} />
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                姓名
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={player.name}
                  name="name"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                俱乐部
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={player.club}
                  name="club"
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
