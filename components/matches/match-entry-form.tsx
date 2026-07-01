"use client";

import type { FormEvent } from "react";
import { Panel } from "@/components/ui/panel";
import type { PlayerSummary, TournamentEventSummary, WeaponType } from "@/lib/domain/types";

interface MatchEntryFormProps {
  activeEvents: TournamentEventSummary[];
  eventId: string;
  eventWeapon?: WeaponType;
  inputClassName: string;
  isSaving: boolean;
  player1Name: string;
  player2Name: string;
  round: string;
  score1: string;
  score2: string;
  selectablePlayers: PlayerSummary[];
  weaponTypes: WeaponType[];
  onEventIdChange(value: string): void;
  onPlayer1NameChange(value: string): void;
  onPlayer2NameChange(value: string): void;
  onRoundChange(value: string): void;
  onScore1Change(value: string): void;
  onScore2Change(value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}

export function MatchEntryForm({
  activeEvents,
  eventId,
  eventWeapon,
  inputClassName,
  isSaving,
  player1Name,
  player2Name,
  round,
  score1,
  score2,
  selectablePlayers,
  weaponTypes,
  onEventIdChange,
  onPlayer1NameChange,
  onPlayer2NameChange,
  onRoundChange,
  onScore1Change,
  onScore2Change,
  onSubmit
}: MatchEntryFormProps) {
  const hasEnoughRegisteredPlayers = selectablePlayers.length >= 2;

  return (
    <Panel eyebrow="Input" title="录入比赛">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-2 text-sm font-bold text-stone-300">
          比赛项目
          <select
            className={inputClassName}
            onChange={(event) => onEventIdChange(event.target.value)}
            value={eventId}
          >
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
              className={inputClassName}
              min="1"
              onChange={(event) => onRoundChange(event.target.value)}
              type="number"
              value={round}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            选手 A
            <select
              className={inputClassName}
              onChange={(event) => onPlayer1NameChange(event.target.value)}
              value={player1Name}
            >
              {selectablePlayers.length === 0 ? (
                <option value="">暂无已报名选手</option>
              ) : null}
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
              className={inputClassName}
              onChange={(event) => onPlayer2NameChange(event.target.value)}
              value={player2Name}
            >
              {selectablePlayers.length < 2 ? (
                <option value="">暂无可选对手</option>
              ) : null}
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
              className={inputClassName}
              min="0"
              onChange={(event) => onScore1Change(event.target.value)}
              type="number"
              value={score1}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-300">
            B 得分
            <input
              className={inputClassName}
              min="0"
              onChange={(event) => onScore2Change(event.target.value)}
              type="number"
              value={score2}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-brass-500/20 bg-brass-500/10 p-4 text-sm text-brass-100">
          当前项目武器：{eventWeapon?.name ?? "未知武器"}。比赛录入仅允许选择当前项目已报名选手。
        </div>

        <button
          className="rounded-2xl bg-brass-500 px-5 py-3 text-sm font-black text-iron-950 transition hover:bg-brass-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving || !hasEnoughRegisteredPlayers}
          type="submit"
        >
          {isSaving ? "提交中..." : hasEnoughRegisteredPlayers ? "保存比赛" : "请先添加参赛选手"}
        </button>
      </form>
    </Panel>
  );
}
