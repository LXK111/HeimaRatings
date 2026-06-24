import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { matches, tournamentEvents, weaponTypes } from "@/lib/mock/dashboard-data";

export default function MatchesPage() {
  return (
    <AppShell
      eyebrow="Match Desk"
      title="比赛录入"
      description="裁判台视角的比赛记录页面。阶段 2 先展示分项目、分轮次、比分和胜者字段。"
    >
      <Panel eyebrow="Matches" title="比赛记录">
        <DataTable
          columns={["轮次", "项目", "武器", "对阵", "比分", "胜者"]}
          rows={matches.map((match) => {
            const event = tournamentEvents.find((item) => item.id === match.eventId);
            const weapon = weaponTypes.find((item) => item.id === match.weaponTypeId);
            return [
              `第 ${match.round} 轮`,
              event?.name ?? "未知项目",
              <StatusBadge key="weapon" label={weapon?.name ?? "未知武器"} tone="brass" />,
              `${match.player1Name} vs ${match.player2Name}`,
              <span className="font-black text-stone-50" key="score">
                {match.score1}:{match.score2}
              </span>,
              <span className="text-piste-500" key="winner">{match.winnerName}</span>
            ];
          })}
        />
      </Panel>
    </AppShell>
  );
}
