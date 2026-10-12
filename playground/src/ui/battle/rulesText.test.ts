import { describe, expect, it } from 'vitest';
import { BENCH_SIZE, FIRST_PLAYER_START_HEARTS, FREE_HEARTS_PER_TURN, MEMORIES_TO_WIN, SECOND_PLAYER_START_HEARTS, START_HAND } from '../../battle/rules';
import { text } from '../text';

const rules = text.battle.howToPlay.sections.flatMap((section) => section.lines).join(' ');

describe('the words of the rules', () => {
  it('say the numbers that the rules use', () => {
    expect(rules).toContain(`${MEMORIES_TO_WIN} Memories`);
    expect(rules).toContain(`${START_HAND} cards`);
    expect(rules).toContain(`up to ${BENCH_SIZE}`);
    expect(rules).toContain(`${FREE_HEARTS_PER_TURN} free Hearts`);
    expect(rules).toContain(`the player who goes second gets ${SECOND_PLAYER_START_HEARTS}`);
  });

  it('say "none" for the first turn of the player who goes first, which is what the rules give', () => {
    expect(FIRST_PLAYER_START_HEARTS).toBe(0);
    expect(rules).toContain('The player who goes first gets none in their first turn');
    expect(text.battle.table.freeHeartNone).toMatch(/None/);
    expect(text.battle.coach.noAttackFirst).toMatch(/no free Hearts/);
  });

  it('say that a move uses up its Hearts, wherever a move is explained', () => {
    expect(rules).toMatch(/uses them up/);
    expect(text.battle.coach.attack).toMatch(/uses up its Hearts/);
    expect(text.battle.table.movesNote).toMatch(/uses up the Hearts/);
    expect(text.tutorial.battle.attack.text).toMatch(/uses up its Hearts/);
  });

  it('name the free Hearts of a turn the same way on the table and in the steps', () => {
    expect(text.battle.steps.turn.heart.hint).toContain(`${FREE_HEARTS_PER_TURN} every turn`);
    expect(text.battle.table.freeHeartWait).toContain(`${FREE_HEARTS_PER_TURN} every turn`);
    expect(text.tutorial.battle.heart.text).toContain(`${FREE_HEARTS_PER_TURN} free Hearts`);
  });
});
