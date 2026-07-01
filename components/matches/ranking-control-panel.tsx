"use client";

import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  PublicRankingPageSummary,
  RankingAlgorithm,
  RankingRow,
  RankingSnapshotSummary,
  WeaponType
} from "@/lib/domain/types";
import { RankingResultTable } from "@/components/matches/ranking-result-table";

interface RankingControlPanelProps {
  algorithm: RankingAlgorithm;
  algorithms: Array<{ label: string; value: RankingAlgorithm }>;
  error: string;
  generatedAt: string;
  inputClassName: string;
  isCalculating: boolean;
  isLoadingMatches: boolean;
  isPublishing: boolean;
  message: string;
  publishedSnapshot?: RankingSnapshotSummary & { items: RankingRow[] };
  publishPageId: string;
  publicPages: PublicRankingPageSummary[];
  rankingRows: RankingRow[];
  selectedWeapon?: WeaponType;
  weaponTypeId: string;
  weapons: WeaponType[];
  onAlgorithmChange(value: RankingAlgorithm): void;
  onCalculate(): void;
  onPublish(): void;
  onPublishPageIdChange(value: string): void;
  onWeaponTypeIdChange(value: string): void;
}

export function RankingControlPanel({
  algorithm,
  algorithms,
  error,
  generatedAt,
  inputClassName,
  isCalculating,
  isLoadingMatches,
  isPublishing,
  message,
  publishedSnapshot,
  publishPageId,
  publicPages,
  rankingRows,
  selectedWeapon,
  weaponTypeId,
  weapons,
  onAlgorithmChange,
  onCalculate,
  onPublish,
  onPublishPageIdChange,
  onWeaponTypeIdChange
}: RankingControlPanelProps) {
  const selectedPublicPage =
    publicPages.find((page) => page.pageId === publishPageId) ?? publicPages[0];

  return (
    <Panel eyebrow="Ranking Engine" title="计算与发布排名">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <label className="grid gap-2 text-sm font-bold text-stone-300">
          计算武器
          <select
            className={inputClassName}
            onChange={(event) => onWeaponTypeIdChange(event.target.value)}
            value={weaponTypeId}
          >
            {weapons.map((weapon) => (
              <option key={weapon.id} value={weapon.id}>
                {weapon.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-300">
          排名算法
          <select
            className={inputClassName}
            onChange={(event) => onAlgorithmChange(event.target.value as RankingAlgorithm)}
            value={algorithm}
          >
            {algorithms.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-300">
          发布目标
          <select
            className={inputClassName}
            onChange={(event) => onPublishPageIdChange(event.target.value)}
            value={publishPageId}
          >
            {publicPages.map((page) => (
              <option key={page.pageId} value={page.pageId}>
                {page.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="self-end rounded-2xl border border-brass-500/60 px-5 py-3 text-sm font-black text-brass-300 transition hover:bg-brass-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isCalculating || isLoadingMatches || isPublishing}
          onClick={onCalculate}
          type="button"
        >
          {isCalculating ? "计算中..." : "重新计算排名"}
        </button>
        <button
          className="self-end rounded-2xl bg-piste-500 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-piste-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPublishing || isCalculating || rankingRows.length === 0}
          onClick={onPublish}
          type="button"
        >
          {isPublishing ? "发布中..." : "发布公开榜单"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge label={selectedWeapon?.name ?? "未知武器"} tone="brass" />
        <StatusBadge label={algorithm.toUpperCase()} tone="muted" />
        {generatedAt ? (
          <StatusBadge label={`生成于 ${new Date(generatedAt).toLocaleString()}`} tone="green" />
        ) : null}
        {publishedSnapshot ? (
          <StatusBadge label={`已发布 ${publishedSnapshot.id}`} tone="green" />
        ) : null}
      </div>

      {publishedSnapshot ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-iron-950/60 p-4 text-sm text-stone-300">
          <p className="font-black text-stone-50">
            公开页：/public/rankings/{selectedPublicPage?.pageId ?? publishPageId}
          </p>
          <p className="mt-2">
            当前快照：{publishedSnapshot.id}，生成时间{" "}
            {new Date(publishedSnapshot.generatedAt).toLocaleString()}。
          </p>
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-2xl border border-piste-500/30 bg-piste-500/10 p-4 text-sm font-semibold text-piste-500">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5">
        <RankingResultTable rows={rankingRows} />
      </div>
    </Panel>
  );
}
