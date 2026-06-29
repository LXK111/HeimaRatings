"use client";

import { DataTable } from "@/components/ui/data-table";
import type { RankingRow } from "@/lib/domain/types";

interface RankingResultTableProps {
  rows: RankingRow[];
}

export function RankingResultTable({ rows }: RankingResultTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-stone-400">
        还没有本次计算结果。录入或确认比赛记录后，点击“重新计算排名”。
      </div>
    );
  }

  return (
    <DataTable
      columns={["排名", "选手", "俱乐部", "积分", "战绩"]}
      rows={rows.map((row) => [
        <span className="font-black text-brass-400" key="rank">
          #{row.rank}
        </span>,
        <span className="font-black text-stone-50" key="name">
          {row.name}
        </span>,
        row.club,
        row.rating,
        `${row.wins}胜 ${row.losses}负 / ${row.matches}场`
      ])}
    />
  );
}
