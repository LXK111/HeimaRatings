"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  MatchSummary,
  RankingAlgorithm,
  RankingEngineInput,
  RankingEngineOutput,
  RankingRow
} from "@/lib/domain/types";
import { players, tournamentEvents, weaponTypes } from "@/lib/mock/dashboard-data";

interface MatchWorkbenchProps {
  tournamentId: string;
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

const algorithms: Array<{ label: string; value: RankingAlgorithm }> = [
  { label: "SDR + Glicko-2", value: "hybrid" },
  { label: "SDR", value: "sdr" },
  { label: "Glicko-2", value: "glicko2" },
  { label: "Elo", value: "elo" }
];

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-iron-950/70 px-4 py-3 text-sm font-semibold text-stone-100 outline-none transition focus:border-brass-500/70 focus:ring-2 focus:ring-brass-500/20";

export function MatchWorkbench({ tournamentId }: MatchWorkbenchProps) {
  const activeEvents = tournamentEvents.filter((event) => event.tournamentId === "tournament-001");
  const enabledWeapons = weaponTypes.filter((weapon) => weapon.enabled);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [eventId, setEventId] = useState(activeEvents[0]?.id ?? "");
  const [round, setRound] = useState("1");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [score1, setScore1] = useState("9");
  const [score2, setScore2] = useState("6");
  const [algorithm, setAlgorithm] = useState<RankingAlgorithm>("hybrid");
  const [weaponTypeId, setWeaponTypeId] = useState(enabledWeapons[0]?.id ?? "");
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedEvent = activeEvents.find((event) => event.id === eventId) ?? activeEvents[0];
  const selectedWeapon = weaponTypes.find((weapon) => weapon.id === weaponTypeId) ?? enabledWeapons[0];
  const eventWeapon = weaponTypes.find((weapon) => weapon.id === selectedEvent?.weaponTypeId);
  const selectablePlayers = useMemo(() => {
    const eventWeaponTypeId = selectedEvent?.weaponTypeId;
    return players.filter((player) =>
      player.weaponRatings.some((rating) => rating.weaponTypeId === eventWeaponTypeId)
    );
  }, [selectedEvent?.weaponTypeId]);
  const filteredMatches = matches.filter((match) => match.weaponTypeId === weaponTypeId);

  useEffect(() => {
    async function loadMatches() {
      setIsLoadingMatches(true);
      setError("");

      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/matches`);
        const payload = (await response.json()) as ApiResponse<MatchSummary[]>;
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error.message : "比赛记录加载失败");
        }
        setMatches(payload.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "比赛记录加载失败");
      } finally {
        setIsLoadingMatches(false);
      }
    }

    void loadMatches();
  }, [tournamentId]);

  useEffect(() => {
    setPlayer1Name(selectablePlayers[0]?.name ?? "");
    setPlayer2Name(selectablePlayers[1]?.name ?? "");
  }, [selectablePlayers]);

  async function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateMatchForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          round: Number(round),
          player1Name,
          player2Name,
          score1: Number(score1),
          score2: Number(score2)
        })
      });
      const payload = (await response.json()) as ApiResponse<MatchSummary>;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "比赛提交失败");
      }

      setMatches((current) => [...current, payload.data]);
      setMessage("比赛已加入本次页面计算队列，尚未写入数据库。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "比赛提交失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function calculateRankings() {
    setError("");
    setMessage("");

    if (!selectedWeapon) {
      setError("请选择要计算的武器类型。");
      return;
    }

    if (filteredMatches.length === 0) {
      setError("当前武器下没有比赛记录，无法计算排名。");
      return;
    }

    const input = buildRankingInput();
    if (input.players.length < 2) {
      setError("当前武器下至少需要 2 名有初始积分的选手。");
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch("/api/rankings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<RankingEngineOutput>;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "排名计算失败");
      }

      setRankingRows(toRankingRows(payload.data));
      setGeneratedAt(payload.data.generatedAt);
      setMessage("排名已基于当前页面比赛列表重新计算。");
    } catch (calculateError) {
      setError(calculateError instanceof Error ? calculateError.message : "排名计算失败");
    } finally {
      setIsCalculating(false);
    }
  }

  function validateMatchForm() {
    const numericScore1 = Number(score1);
    const numericScore2 = Number(score2);
    const numericRound = Number(round);

    if (!eventId) {
      return "请选择比赛项目。";
    }
    if (!player1Name || !player2Name) {
      return "请选择双方选手。";
    }
    if (player1Name === player2Name) {
      return "双方选手不能相同。";
    }
    if (!Number.isFinite(numericRound) || numericRound < 1) {
      return "轮次必须是大于 0 的数字。";
    }
    if (!Number.isFinite(numericScore1) || !Number.isFinite(numericScore2)) {
      return "比分必须是数字。";
    }
    if (numericScore1 < 0 || numericScore2 < 0) {
      return "比分不能小于 0。";
    }

    return "";
  }

  function buildRankingInput(): RankingEngineInput {
    const rankingPlayers = players
      .map((player) => {
        const weaponRating = player.weaponRatings.find(
          (rating) => rating.weaponTypeId === weaponTypeId
        );

        if (!weaponRating) {
          return null;
        }

        return {
          id: player.id,
          name: player.name,
          rating: weaponRating.rating,
          rd: 220,
          sigma: 0.2
        };
      })
      .filter((player): player is NonNullable<typeof player> => Boolean(player));

    const groupedMatches = filteredMatches.reduce<Record<number, MatchSummary[]>>((acc, match) => {
      acc[match.round] = [...(acc[match.round] ?? []), match];
      return acc;
    }, {});

    return {
      tournamentId,
      weaponTypeId,
      algorithm,
      players: rankingPlayers,
      matches: Object.keys(groupedMatches)
        .map(Number)
        .sort((a, b) => a - b)
        .map((matchRound) =>
          groupedMatches[matchRound].map((match) => ({
            id: match.id,
            round: match.round,
            player1: match.player1Name,
            player2: match.player2Name,
            score1: match.score1,
            score2: match.score2
          }))
        )
    };
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
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Panel eyebrow="Input" title="录入比赛">
          <form className="grid gap-4" onSubmit={submitMatch}>
            <label className="grid gap-2 text-sm font-bold text-stone-300">
              比赛项目
              <select className={inputClass} onChange={(event) => setEventId(event.target.value)} value={eventId}>
                {activeEvents.map((item) => {
                  const weapon = weaponTypes.find((weaponItem) => weaponItem.id === item.weaponTypeId);
                  return (
                    <option key={item.id} value={item.id}>
                      {item.name} / {weapon?.name ?? "未知武器"}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-stone-300">
                轮次
                <input
                  className={inputClass}
                  min="1"
                  onChange={(event) => setRound(event.target.value)}
                  type="number"
                  value={round}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-stone-300">
                选手 A
                <select
                  className={inputClass}
                  onChange={(event) => setPlayer1Name(event.target.value)}
                  value={player1Name}
                >
                  {selectablePlayers.map((player) => (
                    <option key={player.id} value={player.name}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-stone-300">
                选手 B
                <select
                  className={inputClass}
                  onChange={(event) => setPlayer2Name(event.target.value)}
                  value={player2Name}
                >
                  {selectablePlayers.map((player) => (
                    <option key={player.id} value={player.name}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-stone-300">
                A 得分
                <input
                  className={inputClass}
                  min="0"
                  onChange={(event) => setScore1(event.target.value)}
                  type="number"
                  value={score1}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-stone-300">
                B 得分
                <input
                  className={inputClass}
                  min="0"
                  onChange={(event) => setScore2(event.target.value)}
                  type="number"
                  value={score2}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-brass-500/20 bg-brass-500/10 p-4 text-sm text-brass-100">
              当前项目武器：{eventWeapon?.name ?? "未知武器"}。提交后只加入本页面计算队列，不写入数据库。
            </div>

            <button
              className="rounded-2xl bg-brass-500 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-brass-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "提交中..." : "加入本次计算"}
            </button>
          </form>
        </Panel>

        <Panel
          action={<StatusBadge label={`${filteredMatches.length} 场`} tone="green" />}
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
      </section>

      <Panel eyebrow="Ranking Engine" title="重新计算排名">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            计算武器
            <select
              className={inputClass}
              onChange={(event) => setWeaponTypeId(event.target.value)}
              value={weaponTypeId}
            >
              {enabledWeapons.map((weapon) => (
                <option key={weapon.id} value={weapon.id}>
                  {weapon.name}
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
            disabled={isCalculating || isLoadingMatches}
            onClick={calculateRankings}
            type="button"
          >
            {isCalculating ? "计算中..." : "重新计算排名"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge label={selectedWeapon?.name ?? "未知武器"} tone="brass" />
          <StatusBadge label={algorithm.toUpperCase()} tone="muted" />
          {generatedAt ? <StatusBadge label={`生成于 ${new Date(generatedAt).toLocaleString()}`} tone="green" /> : null}
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
          {rankingRows.length > 0 ? (
            <DataTable
              columns={["排名", "选手", "俱乐部", "积分", "战绩"]}
              rows={rankingRows.map((row) => [
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
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-stone-400">
              还没有本次计算结果。录入或确认比赛记录后，点击“重新计算排名”。
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
