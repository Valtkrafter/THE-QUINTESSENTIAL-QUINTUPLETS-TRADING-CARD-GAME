import { describe, expect, it } from 'vitest';
import { STARTING_YEN, newSaveGame } from '../domain/save';
import { FIRST_WIN_BONUS_YEN, LOSS_YEN, WIN_YEN, payoutFor, recordBattle, type BattleOutcome } from './rewards';

const NOW = 1_760_000_000_000;
const TODAY = '2026-10-11';
const win = (level: BattleOutcome['level'] = 'normal'): BattleOutcome => ({ rivalId: 'yusuke', level, result: 'win', gaveUp: false });

describe('what a battle pays', () => {
  it('pays more for a harder rival, and a first-win bonus once a day', () => {
    const save = newSaveGame('pay', NOW);
    expect(payoutFor(save.battle, win('easy'), TODAY)).toEqual({ yen: WIN_YEN.easy + FIRST_WIN_BONUS_YEN, base: WIN_YEN.easy, bonus: FIRST_WIN_BONUS_YEN });
    expect(WIN_YEN.easy).toBeLessThan(WIN_YEN.normal);
    expect(WIN_YEN.normal).toBeLessThan(WIN_YEN.hard);
    const first = recordBattle(save, win(), TODAY, NOW);
    expect(first.payout.bonus).toBe(FIRST_WIN_BONUS_YEN);
    const second = recordBattle(first.save, win(), TODAY, NOW + 1);
    expect(second.payout).toEqual({ yen: WIN_YEN.normal, base: WIN_YEN.normal, bonus: 0 });
    const nextDay = recordBattle(second.save, win(), '2026-10-12', NOW + 2);
    expect(nextDay.payout.bonus).toBe(FIRST_WIN_BONUS_YEN);
  });

  it('pays a little for a battle that was lost or drawn, and nothing for giving up', () => {
    const save = newSaveGame('pay', NOW);
    expect(payoutFor(save.battle, { rivalId: 'raiha', level: 'easy', result: 'loss', gaveUp: false }, TODAY).yen).toBe(LOSS_YEN);
    expect(payoutFor(save.battle, { rivalId: 'raiha', level: 'easy', result: 'draw', gaveUp: false }, TODAY).yen).toBe(LOSS_YEN);
    expect(payoutFor(save.battle, { rivalId: 'raiha', level: 'hard', result: 'loss', gaveUp: true }, TODAY).yen).toBe(0);
  });

  it('counts the results, per rival, and pays into the purse', () => {
    let save = newSaveGame('count', NOW);
    save = recordBattle(save, win('easy'), TODAY, NOW).save;
    save = recordBattle(save, { rivalId: 'yusuke', level: 'normal', result: 'loss', gaveUp: false }, TODAY, NOW).save;
    save = recordBattle(save, { rivalId: 'raiha', level: 'easy', result: 'draw', gaveUp: false }, TODAY, NOW).save;
    expect(save.battle).toMatchObject({ wins: 1, losses: 1, draws: 1, lastWinDay: TODAY });
    expect(save.battle.rivals['yusuke']).toEqual({ wins: 1, losses: 1 });
    expect(save.battle.rivals['raiha']).toEqual({ wins: 0, losses: 0 });
    expect(save.player.yen).toBe(STARTING_YEN + WIN_YEN.easy + FIRST_WIN_BONUS_YEN + LOSS_YEN + LOSS_YEN);
  });

  it('counts giving up as a loss that pays nothing and leaves the daily bonus for a real win', () => {
    const save = newSaveGame('quit', NOW);
    const gaveUp = recordBattle(save, { rivalId: 'maruo', level: 'hard', result: 'loss', gaveUp: true }, TODAY, NOW).save;
    expect(gaveUp.battle).toMatchObject({ wins: 0, losses: 1, lastWinDay: null });
    expect(gaveUp.player.yen).toBe(STARTING_YEN);
    expect(recordBattle(gaveUp, win(), TODAY, NOW + 1).payout.bonus).toBe(FIRST_WIN_BONUS_YEN);
  });
});
