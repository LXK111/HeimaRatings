import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
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
      <Panel eyebrow="Events" title="项目列表">
        <DataTable
          columns={["项目", "武器", "赛制", "状态", "比赛数"]}
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
              event.matchCount
            ];
          })}
        />
      </Panel>
    </AppShell>
  );
}
