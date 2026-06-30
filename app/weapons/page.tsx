import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";
import { createWeaponAction, updateWeaponAction } from "@/lib/server/weapon-actions";

export const dynamic = "force-dynamic";

export default async function WeaponsPage() {
  const weaponTypes = await (await getRequestRepository(await getServerRepositoryContext())).listWeapons();

  return (
    <AppShell
      eyebrow="Weapon Registry"
      title="武器类型管理"
      description="维护不同武器类型对应的独立积分池。当前页面通过 Repository 数据源展示武器状态。"
    >
      <Panel eyebrow="Create" title="新增武器类型">
        <form action={createWeaponAction} className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.7fr_auto_auto]">
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            名称
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              name="name"
              placeholder="迅捷剑"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            标识
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 font-mono text-stone-50 outline-none transition focus:border-brass-400"
              name="slug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="smallsword"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            排序
            <input
              className="h-11 rounded-2xl border border-white/10 bg-iron-950 px-3 text-stone-50 outline-none transition focus:border-brass-400"
              min="0"
              name="sortOrder"
              type="number"
            />
          </label>
          <label className="flex items-end gap-2 pb-3 text-sm font-bold text-stone-300">
            <input className="size-4 accent-brass-400" defaultChecked name="enabled" type="checkbox" />
            启用
          </label>
          <button
            className="self-end rounded-2xl bg-brass-400 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-brass-300"
            type="submit"
          >
            新增
          </button>
        </form>
      </Panel>

      <Panel eyebrow="Pools" title="武器积分池">
        <DataTable
          columns={["排序", "武器", "标识", "状态", "编辑"]}
          rows={weaponTypes.map((weapon, index) => [
            index + 1,
            <span className="font-black text-stone-50" key="name">{weapon.name}</span>,
            <span className="font-mono text-brass-400" key="slug">{weapon.slug}</span>,
            <StatusBadge
              key="status"
              label={weapon.enabled ? "启用" : "未启用"}
              tone={weapon.enabled ? "green" : "muted"}
            />,
            <form
              action={updateWeaponAction}
              className="grid min-w-[520px] grid-cols-[1fr_1fr_88px_72px_auto] items-end gap-3"
              key="edit"
            >
              <input name="id" type="hidden" value={weapon.id} />
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                名称
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={weapon.name}
                  name="name"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                标识
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 font-mono text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={weapon.slug}
                  name="slug"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-stone-400">
                排序
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-iron-950 px-3 text-sm text-stone-50 outline-none transition focus:border-brass-400"
                  defaultValue={weapon.sortOrder}
                  min="0"
                  name="sortOrder"
                  type="number"
                />
              </label>
              <label className="flex h-10 items-center gap-2 text-xs font-bold text-stone-300">
                <input className="size-4 accent-brass-400" defaultChecked={weapon.enabled} name="enabled" type="checkbox" />
                启用
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
