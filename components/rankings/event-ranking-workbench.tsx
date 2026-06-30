"use client";

import { useMemo, useState } from "react";
import { RankingResultTable } from "@/components/matches/ranking-result-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  PlayerSummary,
  RankingAlgorithm,
  RankingEngineOutput,
  RankingRow,
  RankingSnapshotSummary,
  TournamentEventSummary,
  WeaponType
} from "@/lib/domain/types";

interface EventRankingWorkbenchProps {
  events: TournamentEventSummary[];
  players: PlayerSummary[];
  tournamentId: string;
  weapons: WeaponType[];
}

interface ApiSuccess<T> {
  data: T;
}

interface ApiFailure {
  error: {
    message: string;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

interface PersistRankingResponse {
  result: RankingEngineOutput;
  snapshot: RankingSnapshotSummary & { items: RankingRow[] };
}

const algorithms: Array<{ label: string; value: RankingAlgorithm }> = [
  { label: "SDR + Glicko-2", value: "hybrid" },
  { label: "SDR", value: "sdr" },
  { label: "Glicko-2", value: "glicko2" },
  { label: "Elo", value: "elo" }
];

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-iron-950/70 px-4 py-3 text-sm font-semibold text-stone-100 outline-none transition focus:border-brass-500/70 focus:ring-2 focus:ring-brass-500/20";

export function EventRankingWorkbench({
  events,
  players,
  tournamentId,
  weapons
}: EventRankingWorkbenchProps) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [algorithm, setAlgorithm] = useState<RankingAlgorithm>("hybrid");
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [snapshot, setSnapshot] = useState<PersistRankingResponse["snapshot"]>();
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0];
  const selectedWeapon = weapons.find((weapon) => weapon.id === selectedEvent?.weaponTypeId);
  const canCalculate = Boolean(selectedEvent && selectedWeapon && selectedEvent.matchCount > 0);

  const eventOptions = useMemo(
    () =>
      events.map((event) => {
        const weapon = weapons.find((item) => item.id === event.weaponTypeId);
        return {
          event,
          label: `${event.name} / ${weapon?.name ?? "未知武器"} / ${event.matchCount} 场`
        };
      }),
    [events, weapons]
  );

  async function calculateEventRanking() {
    await runEventRanking(false);
  }

  async function persistEventRanking() {
    await runEventRanking(true);
  }

  async function runEventRanking(persistSnapshot: boolean) {
    setError("");
    setMessage("");

    if (!selectedEvent || !selectedWeapon) {
      setError("请选择比赛项目。");
      return;
    }
    if (selectedEvent.matchCount === 0) {
      setError("当前项目还没有比赛结果，无法计算项目排名。");
      return;
    }

    if (persistSnapshot) {
      setIsPersisting(true);
    } else {
      setIsCalculating(true);
    }

    try {
      const response = await fetch("/api/rankings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm,
          tournamentId,
          weaponTypeId: selectedWeapon.id,
          eventId: selectedEvent.id,
          persistSnapshot
        })
      });
      const payload = (await response.json()) as ApiResponse<
        RankingEngineOutput | PersistRankingResponse
      >;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "项目排名计算失败");
      }

      const result = persistSnapshot
        ? (payload.data as PersistRankingResponse).result
        : (payload.data as RankingEngineOutput);
      setRankingRows(toRankingRows(result));
      setGeneratedAt(result.generatedAt);
      setSnapshot(persistSnapshot ? (payload.data as PersistRankingResponse).snapshot : undefined);
      setMessage(persistSnapshot ? "项目级排名快照已保存。" : "项目级排名已重新计算。");
    } catch (rankingError) {
      setError(rankingError instanceof Error ? rankingError.message : "项目排名计算失败");
    } finally {
      setIsCalculating(false);
      setIsPersisting(false);
    }
  }

  function toRankingRows(output: RankingEngineOutput): RankingRow[] {
    return output.rankings.map((row) => {
      const player = players.find((item) => item.id === row.playerId || item.name === row.name);
      return {
        playerId: row.playerId,
        name: row.name,
        club: player?.club ?? "未知俱乐部",
        rank: row.rank,
        rating: row.rating,
        matches: row.matches,
        wins: row.wins,
        losses: row.losses
      };
    });
  }

  return (
    <Panel eyebrow="Event Rankings" title="项目级排名计算">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_auto_auto]">
        <label className="grid gap-2 text-sm font-bold text-stone-300">
          比赛项目
          <select
            className={inputClass}
            onChange={(event) => {
              setEventId(event.target.value);
              setRankingRows([]);
              setGeneratedAt("");
              setSnapshot(undefined);
              setMessage("");
              setError("");
            }}
            value={eventId}
          >
            {eventOptions.map(({ event, label }) => (
              <option key={event.id} value={event.id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-300">
          排名算法
          <select
            className={inputClass}
            onChange={(event) => setAlgorithm(event.target.value as RankingAlgorithm)}
            value={algorithm}
          >
            {algorithms.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="self-end rounded-2xl border border-brass-500/60 px-5 py-3 text-sm font-black text-brass-300 transition hover:bg-brass-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canCalculate || isCalculating || isPersisting}
          onClick={calculateEventRanking}
          type="button"
        >
          {isCalculating ? "计算中..." : "计算项目排名"}
        </button>
        <button
          className="self-end rounded-2xl bg-piste-500 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-piste-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canCalculate || isCalculating || isPersisting}
          onClick={persistEventRanking}
          type="button"
        >
          {isPersisting ? "保存中..." : "保存项目快照"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge label={selectedEvent?.name ?? "未知项目"} tone="brass" />
        <StatusBadge label={selectedWeapon?.name ?? "未知武器"} tone="muted" />
        <StatusBadge label={algorithm.toUpperCase()} tone="muted" />
        {generatedAt ? (
          <StatusBadge label={`生成于 ${new Date(generatedAt).toLocaleString()}`} tone="green" />
        ) : null}
        {snapshot ? <StatusBadge label={`快照 ${snapshot.id}`} tone="green" /> : null}
      </div>

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
