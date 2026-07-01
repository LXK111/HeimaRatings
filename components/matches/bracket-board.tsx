"use client";

import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  MatchSummary,
  TournamentEventEntrySummary,
  TournamentEventSummary,
  WeaponType
} from "@/lib/domain/types";

interface BracketBoardProps {
  entries: TournamentEventEntrySummary[];
  event?: TournamentEventSummary;
  matches: MatchSummary[];
  weapon?: WeaponType;
}

export function BracketBoard({ entries, event, matches, weapon }: BracketBoardProps) {
  const rounds = groupMatchesByRound(matches);
  const status = getBracketStatus(event, matches);
  const byeNotices = getByeNotices(entries, matches);

  return (
    <Panel
      action={
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={weapon?.name ?? "未知武器"} tone="brass" />
          <StatusBadge label={status.label} tone={status.tone} />
        </div>
      }
      eyebrow="Bracket"
      title={event ? `${event.name}签表` : "签表视图"}
    >
      {!event ? (
        <p className="text-sm text-stone-400">请选择比赛项目。</p>
      ) : rounds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-stone-400">
          当前项目还没有对阵。可先在比赛项目页生成签表，或在比赛录入区手动添加比赛。
        </div>
      ) : (
        <div className="grid gap-4">
          {byeNotices.length > 0 ? (
            <div className="grid gap-2 rounded-2xl border border-brass-500/25 bg-brass-500/10 p-4 text-sm text-brass-100">
              {byeNotices.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          ) : null}
          <div className="overflow-x-auto pb-2">
            <div
              className="grid min-w-[760px] gap-4"
              style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(220px, 1fr))` }}
            >
              {rounds.map((round) => (
                <section className="grid content-start gap-3" key={round.round}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-stone-50">第 {round.round} 轮</h3>
                    <StatusBadge label={`${round.matches.length} 场`} tone="muted" />
                  </div>
                  {round.matches.map((match) => (
                    <BracketMatchCard key={match.id} match={match} />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function BracketMatchCard({ match }: { match: MatchSummary }) {
  const completed = Boolean(match.winnerId) && match.score1 !== match.score2;

  return (
    <article className="rounded-2xl border border-white/10 bg-iron-950/55 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-stone-500">{match.id}</span>
        <StatusBadge label={completed ? "已完成" : "未完成"} tone={completed ? "green" : "muted"} />
      </div>
      <PlayerLine
        isWinner={match.winnerId === match.player1Id}
        name={match.player1Name}
        score={match.score1}
      />
      <div className="my-2 h-px bg-white/10" />
      <PlayerLine
        isWinner={match.winnerId === match.player2Id}
        name={match.player2Name}
        score={match.score2}
      />
    </article>
  );
}

function PlayerLine({
  isWinner,
  name,
  score
}: {
  isWinner: boolean;
  name: string;
  score: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      <span className={isWinner ? "font-black text-piste-500" : "font-semibold text-stone-200"}>
        {name}
      </span>
      <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-stone-50">
        {score}
      </span>
    </div>
  );
}

function groupMatchesByRound(matches: MatchSummary[]) {
  const grouped = matches.reduce<Record<number, MatchSummary[]>>((acc, match) => {
    acc[match.round] = [...(acc[match.round] ?? []), match];
    return acc;
  }, {});

  return Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .map((round) => ({
      round,
      matches: grouped[round].slice().sort((a, b) => a.id.localeCompare(b.id))
    }));
}

function getBracketStatus(event: TournamentEventSummary | undefined, matches: MatchSummary[]) {
  if (!event) {
    return { label: "未选择", tone: "muted" as const };
  }
  if (matches.length === 0) {
    return { label: "暂无对阵", tone: "muted" as const };
  }

  const latestRound = Math.max(...matches.map((match) => match.round));
  const latestMatches = matches.filter((match) => match.round === latestRound);
  const latestCompleted = latestMatches.every((match) => match.winnerId && match.score1 !== match.score2);
  if (event.format === "single_elimination" && latestMatches.length === 1 && latestCompleted) {
    return { label: `冠军 ${latestMatches[0].winnerName}`, tone: "green" as const };
  }
  if (latestCompleted) {
    return { label: "可生成下一轮", tone: "green" as const };
  }

  return { label: "当前轮进行中", tone: "muted" as const };
}

function getByeNotices(entries: TournamentEventEntrySummary[], matches: MatchSummary[]) {
  const notices: string[] = [];
  const registeredEntries = entries.filter((entry) => entry.status === "registered");
  const firstRoundMatches = matches.filter((match) => match.round === 1);
  if (registeredEntries.length > 0 && firstRoundMatches.length > 0) {
    const firstRoundPlayerIds = new Set(
      firstRoundMatches.flatMap((match) => [match.player1Id, match.player2Id]).filter(Boolean)
    );
    const initialByes = registeredEntries.filter((entry) => !firstRoundPlayerIds.has(entry.playerId));
    if (initialByes.length > 0) {
      notices.push(`首轮轮空：${initialByes.map((entry) => entry.playerName).join("、")}。`);
    }
  }

  const latestRound = matches.length > 0 ? Math.max(...matches.map((match) => match.round)) : undefined;
  const latestMatches = latestRound
    ? matches.filter((match) => match.round === latestRound)
    : [];
  const completedWinners = latestMatches.filter((match) => match.winnerId && match.score1 !== match.score2);
  if (
    latestMatches.length > 1 &&
    completedWinners.length === latestMatches.length &&
    completedWinners.length % 2 !== 0
  ) {
    notices.push("当前轮胜者数量为奇数，下一轮需要轮空落位；本阶段先提示，不自动创建虚拟轮空。");
  }

  return notices;
}
