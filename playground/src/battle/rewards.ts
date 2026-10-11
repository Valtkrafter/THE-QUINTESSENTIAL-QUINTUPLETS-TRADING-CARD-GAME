// What a battle pays. Every battle that was played pays something, a win pays more the harder the rival is, and the first
// win of each day pays a bonus. Giving up pays nothing. Pure code: the screens call `recordBattle` through the game store.

import { earnYen, type BattleRecord, type SaveGame } from '../domain/save';
import type { AiLevel } from './ai';

export const WIN_YEN: Readonly<Record<AiLevel, number>> = { easy: 150, normal: 250, hard: 400 };
/** Paid for a battle that was lost or drawn after being played to the end. */
export const LOSS_YEN = 50;
export const FIRST_WIN_BONUS_YEN = 200;

export interface BattleOutcome {
  readonly rivalId: string;
  readonly level: AiLevel;
  readonly result: 'win' | 'loss' | 'draw';
  /** The player gave up: nothing is paid. */
  readonly gaveUp: boolean;
}

export interface Payout {
  readonly yen: number;
  /** What the result itself pays. */
  readonly base: number;
  /** The "first win of the day" bonus (part of `yen`). */
  readonly bonus: number;
}

/** What the battle pays, given the day of the last bonus. `today` is a day key like "2026-10-11". */
export function payoutFor(record: BattleRecord, outcome: BattleOutcome, today: string): Payout {
  if (outcome.gaveUp) {
    return { yen: 0, base: 0, bonus: 0 };
  }
  if (outcome.result === 'win') {
    const bonus = record.lastWinDay === today ? 0 : FIRST_WIN_BONUS_YEN;
    return { yen: WIN_YEN[outcome.level] + bonus, base: WIN_YEN[outcome.level], bonus };
  }
  return { yen: LOSS_YEN, base: LOSS_YEN, bonus: 0 };
}

/** Writes the result into the record and pays the yen. Returns a new save and what was paid. */
export function recordBattle(save: SaveGame, outcome: BattleOutcome, today: string, now: number): { readonly save: SaveGame; readonly payout: Payout } {
  const payout = payoutFor(save.battle, outcome, today);
  const before = save.battle.rivals[outcome.rivalId] ?? { wins: 0, losses: 0 };
  const rival = { wins: before.wins + (outcome.result === 'win' ? 1 : 0), losses: before.losses + (outcome.result === 'loss' ? 1 : 0) };
  const battle: BattleRecord = {
    wins: save.battle.wins + (outcome.result === 'win' ? 1 : 0),
    losses: save.battle.losses + (outcome.result === 'loss' ? 1 : 0),
    draws: save.battle.draws + (outcome.result === 'draw' ? 1 : 0),
    rivals: { ...save.battle.rivals, [outcome.rivalId]: rival },
    lastWinDay: outcome.result === 'win' && !outcome.gaveUp ? today : save.battle.lastWinDay,
  };
  return { save: earnYen({ ...save, battle }, payout.yen, now), payout };
}
