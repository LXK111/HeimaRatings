import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RankingRow, WeaponType } from "@/lib/domain/types";

interface RankingBoardProps {
  weapon: WeaponType;
  rows: RankingRow[];
  compact?: boolean;
}

export function RankingBoard({ weapon, rows, compact = false }: RankingBoardProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-brass-400">
            {weapon.slug}
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-50">{weapon.name}排名</h2>
        </div>
        <StatusBadge label="HYBRID" tone="brass" />
      </div>
      <DataTable
        columns={compact ? ["排名", "选手", "积分"] : ["排名", "选手", "俱乐部", "积分", "战绩"]}
        rows={rows.map((row) =>
          compact
            ? [
                <span className="font-black text-brass-400" key="rank">#{row.rank}</span>,
                row.name,
                row.rating
              ]
            : [
                <span className="font-black text-brass-400" key="rank">#{row.rank}</span>,
                <span className="font-black text-stone-50" key="name">{row.name}</span>,
                row.club,
                row.rating,
                `${row.wins}胜 ${row.losses}负 / ${row.matches}场`
              ]
        )}
      />
    </div>
  );
}
