import { describe, expect, it } from 'vitest';
import { DAILY_BONUS_YEN, claimDailyBonus, dailyBonusWaiting } from './daily';
import { STARTING_YEN, newSaveGame } from './save';

const NOW = 1_760_000_000_000;

describe('daily bonus', () => {
  it('is waiting on the first day and can be taken once', () => {
    const start = newSaveGame('daily', NOW);
    expect(dailyBonusWaiting(start, '2026-10-10')).toBe(DAILY_BONUS_YEN);
    const first = claimDailyBonus(start, '2026-10-10', NOW);
    expect(first.amount).toBe(DAILY_BONUS_YEN);
    expect(first.save.player.yen).toBe(STARTING_YEN + DAILY_BONUS_YEN);
    const again = claimDailyBonus(first.save, '2026-10-10', NOW + 1);
    expect(again.amount).toBe(0);
    expect(again.save).toBe(first.save);
  });

  it('gives one day of bonus for each new day', () => {
    const first = claimDailyBonus(newSaveGame('daily', NOW), '2026-10-10', NOW).save;
    expect(dailyBonusWaiting(first, '2026-10-11')).toBe(DAILY_BONUS_YEN);
    expect(dailyBonusWaiting(first, '2026-10-12')).toBe(2 * DAILY_BONUS_YEN);
  });

  it('stores at most three days while you are away', () => {
    const first = claimDailyBonus(newSaveGame('daily', NOW), '2026-10-10', NOW).save;
    expect(dailyBonusWaiting(first, '2026-10-30')).toBe(3 * DAILY_BONUS_YEN);
    const back = claimDailyBonus(first, '2026-10-30', NOW);
    expect(back.amount).toBe(3 * DAILY_BONUS_YEN);
    expect(back.save.daily.lastClaim).toBe('2026-10-30');
  });

  it('pays nothing when the clock was turned back', () => {
    const first = claimDailyBonus(newSaveGame('daily', NOW), '2026-10-10', NOW).save;
    expect(dailyBonusWaiting(first, '2026-10-01')).toBe(0);
    expect(claimDailyBonus(first, '2026-10-01', NOW).save).toBe(first);
  });
});
