import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { weaponTypes } from "@/lib/mock/dashboard-data";

export default function WeaponsPage() {
  return (
    <AppShell
      eyebrow="Weapon Registry"
      title="武器类型管理"
      description="维护不同武器类型对应的独立积分池。阶段 2 先展示静态列表，后续阶段会接入创建、排序和启停接口。"
    >
      <Panel eyebrow="Pools" title="武器积分池">
        <DataTable
          columns={["排序", "武器", "标识", "状态", "说明"]}
          rows={weaponTypes.map((weapon, index) => [
            index + 1,
            <span className="font-black text-stone-50" key="name">{weapon.name}</span>,
            <span className="font-mono text-brass-400" key="slug">{weapon.slug}</span>,
            <StatusBadge
              key="status"
              label={weapon.enabled ? "启用" : "未启用"}
              tone={weapon.enabled ? "green" : "muted"}
            />,
            weapon.enabled ? "可参与比赛项目和排名计算" : "暂不显示在公开榜单"
          ])}
        />
      </Panel>
    </AppShell>
  );
}
