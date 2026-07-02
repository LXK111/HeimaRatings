"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BracketBoard } from "@/components/matches/bracket-board";
import { MatchEntryForm } from "@/components/matches/match-entry-form";
import { MatchListPanel } from "@/components/matches/match-list-panel";
import { RankingControlPanel } from "@/components/matches/ranking-control-panel";
import type {
  BracketSlotSummary,
  MatchSummary,
  PlayerSummary,
  PublicRankingPageSummary,
  RankingAlgorithm,
  RankingEngineInput,
  RankingEngineOutput,
  RankingRow,
  RankingSnapshotSummary,
  TournamentEventEntrySummary,
  TournamentEventSummary,
  WeaponType
} from "@/lib/domain/types";

interface MatchWorkbenchProps {
  events: TournamentEventSummary[];
  initialEventId?: string;
  players: PlayerSummary[];
  publicPages: PublicRankingPageSummary[];
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

interface PublishRankingResponse {
  result: RankingEngineOutput;
  snapshot: RankingSnapshotSummary & { items: RankingRow[] };
  publishPageId?: string;
}

const algorithms: Array<{ label: string; value: RankingAlgorithm }> = [
  { label: "SDR + Glicko-2", value: "hybrid" },
  { label: "SDR", value: "sdr" },
  { label: "Glicko-2", value: "glicko2" },
  { label: "Elo", value: "elo" }
];

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-iron-950/70 px-4 py-3 text-sm font-semibold text-stone-100 outline-none transition focus:border-brass-500/70 focus:ring-2 focus:ring-brass-500/20";

const fallbackPublicPages: PublicRankingPageSummary[] = [
  {
    pageId: "demo",
    title: "HEMA 春季积分赛公开榜单",
    enabled: true,
    theme: "dark",
    tournamentId: "demo"
  }
];

function resolveInitialEventId(events: TournamentEventSummary[], initialEventId?: string) {
  if (initialEventId && events.some((event) => event.id === initialEventId)) {
    return initialEventId;
  }

  return events[0]?.id ?? "";
}

export function MatchWorkbench({
  events,
  initialEventId,
  players,
  publicPages,
  tournamentId,
  weapons
}: MatchWorkbenchProps) {
  const activeEvents = events;
  const enabledWeapons = weapons.filter((weapon) => weapon.enabled);
  const publishTargets = useMemo(
    () => (publicPages.length > 0 ? publicPages : fallbackPublicPages),
    [publicPages]
  );
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [bracketSlots, setBracketSlots] = useState<BracketSlotSummary[]>([]);
  const [eventId, setEventId] = useState(() => resolveInitialEventId(activeEvents, initialEventId));
  const [round, setRound] = useState("1");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [score1, setScore1] = useState("9");
  const [score2, setScore2] = useState("6");
  const [entries, setEntries] = useState<TournamentEventEntrySummary[]>([]);
  const [algorithm, setAlgorithm] = useState<RankingAlgorithm>("hybrid");
  const [weaponTypeId, setWeaponTypeId] = useState(enabledWeapons[0]?.id ?? "");
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [publishedSnapshot, setPublishedSnapshot] = useState<PublishRankingResponse["snapshot"]>();
  const [publishPageId, setPublishPageId] = useState(publishTargets[0]?.pageId ?? "demo");
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingMatchId, setIsUpdatingMatchId] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lastInitialEventIdRef = useRef(initialEventId);

  const selectedEvent = activeEvents.find((event) => event.id === eventId) ?? activeEvents[0];
  const selectedWeapon = weapons.find((weapon) => weapon.id === weaponTypeId) ?? enabledWeapons[0];
  const selectedPublishPage =
    publishTargets.find((page) => page.pageId === publishPageId) ?? publishTargets[0];
  const eventWeapon = weapons.find((weapon) => weapon.id === selectedEvent?.weaponTypeId);
  const selectedEventMatches = selectedEvent
    ? matches.filter((match) => match.eventId === selectedEvent.id)
    : [];
  const selectedEventSlots = selectedEvent
    ? bracketSlots.filter((slot) => slot.eventId === selectedEvent.id)
    : [];
  const selectablePlayers = useMemo(() => {
    const playerById = new Map(players.map((player) => [player.id, player]));
    return entries
      .filter((entry) => entry.status === "registered")
      .map((entry) => playerById.get(entry.playerId))
      .filter((player): player is PlayerSummary => Boolean(player));
  }, [entries, players]);
  const selectablePlayerNames = useMemo(
    () => new Set(selectablePlayers.map((player) => player.name)),
    [selectablePlayers]
  );
  const filteredMatches = matches.filter((match) => match.weaponTypeId === weaponTypeId);
  const advanceDisabledReason = getAdvanceDisabledReason(selectedEvent, selectedEventMatches, entries);

  useEffect(() => {
    const nextEventId = resolveInitialEventId(activeEvents, initialEventId);
    const initialEventChanged = lastInitialEventIdRef.current !== initialEventId;
    setEventId((currentEventId) => {
      if (initialEventChanged) {
        return nextEventId;
      }
      if (currentEventId && activeEvents.some((event) => event.id === currentEventId)) {
        return currentEventId;
      }
      return nextEventId;
    });
    lastInitialEventIdRef.current = initialEventId;
  }, [activeEvents, initialEventId]);

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
    async function loadEntries() {
      if (!selectedEvent) {
        setEntries([]);
        return;
      }
      setEntries([]);

      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/events/${selectedEvent.id}/entries`);
        const payload = (await response.json()) as ApiResponse<TournamentEventEntrySummary[]>;
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error.message : "参赛名单加载失败");
        }
        setEntries(payload.data);
      } catch {
        setEntries([]);
      }
    }

    void loadEntries();
  }, [selectedEvent?.id, tournamentId]);

  useEffect(() => {
    async function loadBracketSlots() {
      if (!selectedEvent) {
        setBracketSlots([]);
        return;
      }

      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/events/${selectedEvent.id}/bracket/slots`);
        const payload = (await response.json()) as ApiResponse<BracketSlotSummary[]>;
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error.message : "签位加载失败");
        }
        setBracketSlots((current) => [
          ...current.filter((slot) => slot.eventId !== selectedEvent.id),
          ...payload.data
        ]);
      } catch {
        setBracketSlots((current) => current.filter((slot) => slot.eventId !== selectedEvent.id));
      }
    }

    void loadBracketSlots();
  }, [selectedEvent?.id, tournamentId]);

  useEffect(() => {
    setPlayer1Name(selectablePlayers[0]?.name ?? "");
    setPlayer2Name(selectablePlayers[1]?.name ?? "");
  }, [selectablePlayers]);

  useEffect(() => {
    if (!publishTargets.some((page) => page.pageId === publishPageId)) {
      setPublishPageId(publishTargets[0]?.pageId ?? "demo");
    }
  }, [publishPageId, publishTargets]);

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
      setRankingRows([]);
      setGeneratedAt("");
      setPublishedSnapshot(undefined);
      setMessage("比赛已保存并加入当前计算队列。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "比赛提交失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateMatchResult(matchId: string, nextScore1: number, nextScore2: number, winnerId: string) {
    setError("");
    setMessage("");

    if (!winnerId) {
      setError("请选择胜者。");
      return;
    }
    if (!Number.isFinite(nextScore1) || !Number.isFinite(nextScore2)) {
      setError("比分必须是数字。");
      return;
    }
    if (nextScore1 < 0 || nextScore2 < 0) {
      setError("比分不能小于 0。");
      return;
    }
    if (nextScore1 === nextScore2) {
      setError("淘汰赛结果不能平局。");
      return;
    }

    setIsUpdatingMatchId(matchId);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: matchId,
          score1: nextScore1,
          score2: nextScore2,
          winnerId
        })
      });
      const payload = (await response.json()) as ApiResponse<MatchSummary>;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "比赛结果保存失败");
      }

      setMatches((current) => current.map((match) => (match.id === matchId ? payload.data : match)));
      resetRankingResult();
      setMessage("比赛结果已保存。");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "比赛结果保存失败");
    } finally {
      setIsUpdatingMatchId("");
    }
  }

  async function advanceBracket() {
    setError("");
    setMessage("");

    if (!selectedEvent) {
      setError("请选择比赛项目。");
      return;
    }
    if (advanceDisabledReason) {
      setError(advanceDisabledReason);
      return;
    }

    setIsAdvancing(true);
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/events/${selectedEvent.id}/bracket/advance`,
        { method: "POST" }
      );
      const payload = (await response.json()) as ApiResponse<MatchSummary[]>;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "下一轮生成失败");
      }

      setMatches((current) => [...current, ...payload.data]);
      await refreshBracketSlots(selectedEvent.id);
      resetRankingResult();
      setMessage(`已生成 ${payload.data.length} 场下一轮对阵。`);
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : "下一轮生成失败");
    } finally {
      setIsAdvancing(false);
    }
  }

  async function refreshBracketSlots(nextEventId: string) {
    const response = await fetch(`/api/tournaments/${tournamentId}/events/${nextEventId}/bracket/slots`);
    const payload = (await response.json()) as ApiResponse<BracketSlotSummary[]>;
    if (!response.ok || "error" in payload) {
      return;
    }

    setBracketSlots((current) => [
      ...current.filter((slot) => slot.eventId !== nextEventId),
      ...payload.data
    ]);
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
        body: JSON.stringify({
          algorithm,
          scope: "tournament",
          tournamentId,
          weaponTypeId,
          updateRatings: true
        })
      });
      const payload = (await response.json()) as ApiResponse<RankingEngineOutput>;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "排名计算失败");
      }

      setRankingRows(toRankingRows(payload.data));
      setGeneratedAt(payload.data.generatedAt);
      setPublishedSnapshot(undefined);
      setMessage("排名已基于当前赛事比赛结果重新计算，并已更新长期积分。");
    } catch (calculateError) {
      setError(calculateError instanceof Error ? calculateError.message : "排名计算失败");
    } finally {
      setIsCalculating(false);
    }
  }

  async function publishRankings() {
    setError("");
    setMessage("");

    if (!selectedWeapon) {
      setError("请选择要发布的武器类型。");
      return;
    }

    if (rankingRows.length === 0) {
      setError("请先计算排名，再发布公开榜单。");
      return;
    }
    if (!selectedPublishPage) {
      setError("请选择公开页发布目标。");
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch("/api/rankings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm,
          scope: "organization",
          weaponTypeId,
          persistSnapshot: true,
          publishPageId: selectedPublishPage.pageId
        })
      });
      const payload = (await response.json()) as ApiResponse<PublishRankingResponse>;
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error.message : "榜单发布失败");
      }

      setRankingRows(toRankingRows(payload.data.result));
      setGeneratedAt(payload.data.result.generatedAt);
      setPublishedSnapshot(payload.data.snapshot);
      setMessage(
        `组织长期总榜已发布，快照 ${payload.data.snapshot.id} 已成为 ${selectedPublishPage.title} 最新版本。`
      );
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "榜单发布失败");
    } finally {
      setIsPublishing(false);
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
    if (selectablePlayers.length < 2) {
      return "当前比赛项目至少需要 2 名已报名选手才能录入比赛。";
    }
    if (!selectablePlayerNames.has(player1Name) || !selectablePlayerNames.has(player2Name)) {
      return "只能选择当前比赛项目已报名的选手。";
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

  function resetRankingResult() {
    setRankingRows([]);
    setGeneratedAt("");
    setPublishedSnapshot(undefined);
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
        <MatchEntryForm
          activeEvents={activeEvents}
          eventId={eventId}
          eventWeapon={eventWeapon}
          inputClassName={inputClass}
          isSaving={isSaving}
          player1Name={player1Name}
          player2Name={player2Name}
          round={round}
          score1={score1}
          score2={score2}
          selectablePlayers={selectablePlayers}
          weaponTypes={weapons}
          onEventIdChange={setEventId}
          onPlayer1NameChange={setPlayer1Name}
          onPlayer2NameChange={setPlayer2Name}
          onRoundChange={setRound}
          onScore1Change={setScore1}
          onScore2Change={setScore2}
          onSubmit={submitMatch}
        />

        <MatchListPanel
          advanceDisabledReason={advanceDisabledReason}
          filteredMatchCount={filteredMatches.length}
          isLoadingMatches={isLoadingMatches}
          isAdvancing={isAdvancing}
          isUpdatingMatchId={isUpdatingMatchId}
          matches={matches}
          tournamentEvents={events}
          weaponTypes={weapons}
          onAdvanceBracket={advanceBracket}
          onUpdateResult={updateMatchResult}
        />
      </section>

      <BracketBoard
        entries={entries}
        event={selectedEvent}
        matches={selectedEventMatches}
        slots={selectedEventSlots}
        weapon={eventWeapon}
      />

      <RankingControlPanel
        algorithm={algorithm}
        algorithms={algorithms}
        error={error}
        generatedAt={generatedAt}
        inputClassName={inputClass}
        isCalculating={isCalculating}
        isLoadingMatches={isLoadingMatches}
        isPublishing={isPublishing}
        message={message}
        publishedSnapshot={publishedSnapshot}
        publishPageId={publishPageId}
        publicPages={publishTargets}
        rankingRows={rankingRows}
        selectedWeapon={selectedWeapon}
        weaponTypeId={weaponTypeId}
        weapons={enabledWeapons}
        onAlgorithmChange={setAlgorithm}
        onCalculate={calculateRankings}
        onPublish={publishRankings}
        onPublishPageIdChange={setPublishPageId}
        onWeaponTypeIdChange={setWeaponTypeId}
      />
    </div>
  );
}

function getAdvanceDisabledReason(
  selectedEvent: TournamentEventSummary | undefined,
  eventMatches: MatchSummary[],
  entries: TournamentEventEntrySummary[]
) {
  if (!selectedEvent) {
    return "请选择比赛项目";
  }
  if (selectedEvent.format !== "single_elimination") {
    return "仅单败淘汰支持晋级";
  }
  if (eventMatches.length === 0) {
    return "当前项目没有对阵";
  }

  const currentRound = Math.max(...eventMatches.map((match) => match.round));
  const currentRoundMatches = eventMatches.filter((match) => match.round === currentRound);
  if (currentRoundMatches.some((match) => !match.winnerId || match.score1 === match.score2)) {
    return "当前轮尚未全部完成";
  }

  const advancementCandidates = getAdvancementCandidateCount(eventMatches, currentRound, entries);
  if (advancementCandidates < 2) {
    return "当前项目已有冠军";
  }

  return "";
}

function getAdvancementCandidateCount(
  eventMatches: MatchSummary[],
  currentRound: number,
  entries: TournamentEventEntrySummary[]
) {
  const currentRoundMatches = eventMatches.filter((match) => match.round === currentRound);
  const currentWinners = currentRoundMatches.filter((match) => match.winnerId && match.score1 !== match.score2);
  const currentRoundPlayerIds = new Set(
    currentRoundMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter(Boolean)
  );

  if (currentRound === 1) {
    const initialByes = entries.filter(
      (entry) => entry.status === "registered" && !currentRoundPlayerIds.has(entry.playerId)
    );
    return currentWinners.length + initialByes.length;
  }

  const previousRoundMatches = eventMatches.filter((match) => match.round === currentRound - 1);
  const pendingByes = previousRoundMatches.filter(
    (match) =>
      match.winnerId &&
      match.score1 !== match.score2 &&
      !currentRoundPlayerIds.has(match.winnerId)
  );
  return currentWinners.length + pendingByes.length;
}
