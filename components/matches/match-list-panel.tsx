"use client";

import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MatchSummary, TournamentEventSummary, WeaponType } from "@/lib/domain/types";

interface MatchListPanelProps {
  filteredMatchCount: number;
  isLoadingMatches: boolean;
  matches: MatchSummary[];
  tournamentEvents: TournamentEventSummary[];
  weaponTypes: WeaponType[];
}

export function MatchListPanel({
  filteredMatchCount,
  isLoadingMatches,
  matches,
  tournamentEvents,
  weaponTypes
}: MatchListPanelProps) {
  return (
    <Panel
      action={<StatusBadge label={`${filteredMatchCount} 场`} tone="green" />}
      eyebrow="Matches"
      title="当前页面比赛列表"
    >
      {isLoadingMatches ? (
        <p className="text-sm text-stone-400">正在加载比赛记录...</p>
      ) : (
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
              <span className="text-piste-500" key="winner">
                {match.winnerName}
              </span>
            ];
          })}
        />
      )}
    </Panel>
  );
}
