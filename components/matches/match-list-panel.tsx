"use client";

import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MatchSummary, TournamentEventSummary, WeaponType } from "@/lib/domain/types";

interface MatchListPanelProps {
  advanceDisabledReason: string;
  filteredMatchCount: number;
  isLoadingMatches: boolean;
  isAdvancing: boolean;
  isUpdatingMatchId: string;
  matches: MatchSummary[];
  tournamentEvents: TournamentEventSummary[];
  weaponTypes: WeaponType[];
  onAdvanceBracket(): void;
  onUpdateResult(matchId: string, score1: number, score2: number, winnerId: string): void;
}

export function MatchListPanel({
  advanceDisabledReason,
  filteredMatchCount,
  isLoadingMatches,
  isAdvancing,
  isUpdatingMatchId,
  matches,
  tournamentEvents,
  weaponTypes,
  onAdvanceBracket,
  onUpdateResult
}: MatchListPanelProps) {
  return (
    <Panel
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={`${filteredMatchCount} 场`} tone="green" />
          <button
            className="rounded-2xl border border-brass-500/30 px-4 py-2 text-xs font-black text-brass-100 transition hover:border-brass-400 hover:text-brass-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(advanceDisabledReason) || isAdvancing}
            onClick={onAdvanceBracket}
            title={advanceDisabledReason || "生成下一轮"}
            type="button"
          >
            {isAdvancing ? "生成中..." : "生成下一轮"}
          </button>
        </div>
      }
      eyebrow="Matches"
      title="当前页面比赛列表"
    >
      {isLoadingMatches ? (
        <p className="text-sm text-stone-400">正在加载比赛记录...</p>
      ) : (
        <DataTable
          columns={["轮次", "项目", "武器", "对阵", "比分", "胜者", "结果"]}
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
              </span>,
              <MatchResultForm
                isSaving={isUpdatingMatchId === match.id}
                key="result"
                match={match}
                onUpdateResult={onUpdateResult}
              />
            ];
          })}
        />
      )}
    </Panel>
  );
}

function MatchResultForm({
  isSaving,
  match,
  onUpdateResult
}: {
  isSaving: boolean;
  match: MatchSummary;
  onUpdateResult(matchId: string, score1: number, score2: number, winnerId: string): void;
}) {
  const canUpdate = Boolean(match.player1Id && match.player2Id);

  return (
    <form
      className="grid min-w-[260px] gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onUpdateResult(
          match.id,
          Number(formData.get("score1")),
          Number(formData.get("score2")),
          String(formData.get("winnerId") ?? "")
        );
      }}
    >
      <div className="grid grid-cols-[70px_70px_1fr] gap-2">
        <input
          className="rounded-xl border border-white/10 bg-iron-950/70 px-2 py-2 text-xs font-bold text-stone-100"
          defaultValue={match.score1}
          min="0"
          name="score1"
          type="number"
        />
        <input
          className="rounded-xl border border-white/10 bg-iron-950/70 px-2 py-2 text-xs font-bold text-stone-100"
          defaultValue={match.score2}
          min="0"
          name="score2"
          type="number"
        />
        <select
          className="rounded-xl border border-white/10 bg-iron-950/70 px-2 py-2 text-xs font-bold text-stone-100"
          defaultValue={match.winnerId ?? ""}
          disabled={!canUpdate}
          name="winnerId"
        >
          <option value="">选择胜者</option>
          <option value={match.player1Id}>{match.player1Name}</option>
          <option value={match.player2Id}>{match.player2Name}</option>
        </select>
      </div>
      <button
        className="rounded-xl bg-piste-500 px-3 py-2 text-xs font-black text-iron-950 transition hover:bg-piste-400 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canUpdate || isSaving}
        type="submit"
      >
        {isSaving ? "保存中..." : "保存结果"}
      </button>
    </form>
  );
}
