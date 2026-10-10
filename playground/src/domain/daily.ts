// The daily bonus: a fixed amount per calendar day. Days you miss pile up for a few days, so being away costs nothing
// (up to the limit), and there is no streak to lose.

import { daysBetween, type DayKey } from './calendar';
import { earnYen, type SaveGame } from './save';

export const DAILY_BONUS_YEN = 400;
/** Most days of bonus that can wait for you. */
export const DAILY_BONUS_STORED_DAYS = 3;

/** How many days of bonus are waiting today (0 when today's was already taken). */
export function daysWaiting(save: SaveGame, today: DayKey): number {
  const last = save.daily.lastClaim;
  if (last === null) {
    return 1;
  }
  return Math.max(0, Math.min(DAILY_BONUS_STORED_DAYS, daysBetween(last, today)));
}

export function dailyBonusWaiting(save: SaveGame, today: DayKey): number {
  return daysWaiting(save, today) * DAILY_BONUS_YEN;
}

export interface DailyClaim {
  readonly save: SaveGame;
  readonly amount: number;
}

/** Takes the waiting bonus. When nothing is waiting the save comes back unchanged with an amount of 0. */
export function claimDailyBonus(save: SaveGame, today: DayKey, now: number): DailyClaim {
  const amount = dailyBonusWaiting(save, today);
  if (amount === 0) {
    return { save, amount: 0 };
  }
  const paid = earnYen(save, amount, now);
  return { save: { ...paid, daily: { lastClaim: today } }, amount };
}
