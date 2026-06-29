import { AppShell } from "@/components/layout/app-shell";
import { ActionLink } from "@/components/ui/action-link";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRepository } from "@/lib/server/repositories/factory";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await getRepository().listTournaments();
  const primaryTournament = tournaments[0];

  return (
    <AppShell
      eyebrow="Events"
      title="赛事管理"
      description="一个赛事可以包含多个比赛项目，每个比赛项目绑定一个武器类型。当前页面展示赛事入口和状态。"
    >
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
          columns={["赛事", "状态", "项目数", "比赛数", "默认算法"]}
          rows={tournaments.map((tournament) => [
            <span className="font-black text-stone-50" key="name">{tournament.name}</span>,
            <StatusBadge
              key="status"
              label={tournament.status === "active" ? "进行中" : "草稿"}
              tone={tournament.status === "active" ? "green" : "muted"}
            />,
            tournament.eventCount,
            tournament.matchCount,
            tournament.defaultAlgorithm.toUpperCase()
          ])}
        />
      </Panel>
    </AppShell>
  );
}
