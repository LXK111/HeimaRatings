import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { players, weaponTypes } from "@/lib/mock/dashboard-data";

export default function PlayersPage() {
  return (
    <AppShell
      eyebrow="Roster"
      title="选手管理"
      description="展示选手基础信息和分武器积分摘要。阶段 2 使用 Mock 数据确认信息密度和表格结构。"
    >
      <Panel eyebrow="Fighters" title="选手名册">
        <DataTable
          columns={["选手", "俱乐部", "分武器积分", "备注"]}
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
            "后续支持编辑基础信息和初始积分"
          ])}
        />
      </Panel>
    </AppShell>
  );
}
