import { describe, expect, it } from 'vitest';
import { legalActions } from '../../battle/legal';
import { mainState, play } from '../../battle/testing';
import { figureOptions, handOptions, heartsLeft, isPlayable, moodOf, moveViews, promptFor } from './viewModel';

const ICHIKA = { stack: ['TQQ01-001'] } as const;
const NINO = { stack: ['TQQ01-013'] } as const;

describe('what can be done with a card in the hand', () => {
  it('knows whether it goes to the Bench, evolves something or is a Supporter', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-013', 'TQQ01-004', 'TQQ01-067', 'TQQ01-006'], active: ICHIKA }, { active: NINO }] });
    const legal = legalActions(state, 0);
    expect(handOptions(legal, 0)).toMatchObject({ place: { type: 'play-basic', handIndex: 0 }, evolve: [], supporter: null });
    expect(handOptions(legal, 1).evolve).toEqual([{ type: 'evolve', handIndex: 1, target: { zone: 'active' } }]);
    expect(handOptions(legal, 2).supporter).toEqual({ type: 'play-supporter', handIndex: 2 });
    expect(isPlayable(handOptions(legal, 3))).toBe(false);
    expect(isPlayable(handOptions(legal, 0))).toBe(true);
  });
});

describe('what can be done with a Character in play', () => {
  it('finds the Heart, the ability and the retreat of each one', () => {
    const state = mainState({
      players: [{ active: { stack: ['TQQ01-001'], hearts: 1 }, bench: [{ stack: ['TQQ01-047'] }, NINO] }, { active: NINO }],
    });
    const legal = legalActions(state, 0);
    expect(figureOptions(legal, { zone: 'active' })).toMatchObject({ giveHeart: { type: 'give-heart' }, ability: null, retreat: null });
    expect(figureOptions(legal, { zone: 'bench', index: 0 })).toMatchObject({
      giveHeart: { type: 'give-heart' },
      ability: { type: 'use-ability', figure: { zone: 'bench', index: 0 } },
      retreat: { type: 'retreat', benchIndex: 0 },
    });
    const used = play(state, { type: 'give-heart', target: { zone: 'active' } }).state;
    expect(figureOptions(legalActions(used, 0), { zone: 'active' }).giveHeart).toBeNull();
    expect(heartsLeft(state, 0)).toBe(1);
    expect(heartsLeft(used, 0)).toBe(0);
  });
});

describe('the moves of the Active Character', () => {
  it('shows what each move would do to the enemy and which ones can be used', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 1 } }, { active: { stack: ['TQQ01-013'] } }] });
    const moves = moveViews(state, 0, legalActions(state, 0));
    expect(moves.map((move) => move.name)).toEqual(['Warm-Up Scene', 'Rehearsal']);
    expect(moves.map((move) => move.usable)).toEqual([true, false]);
    // Nino resists Ichika's Heart: 20 - 30 is nothing.
    expect(moves[0]).toMatchObject({ printed: '20', estimate: 0, resisted: true, doubled: false });
    expect(moves[1]).toMatchObject({ printed: '40', estimate: 10 });
  });

  it('prints plus and times signs and leaves out damage when a move has none', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-042'], hearts: 1 } }, { active: NINO }] });
    expect(moveViews(state, 0, legalActions(state, 0))[0]).toMatchObject({ printed: '', estimate: null, usable: true });
    const times = mainState({ players: [{ active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-054'], hearts: 3 }, bench: [ICHIKA] }, { active: NINO }] });
    expect(moveViews(times, 0, legalActions(times, 0))[0]).toMatchObject({ printed: '40×', estimate: 80 });
  });
});

describe('the state of the battle', () => {
  it('says whose turn it is', () => {
    expect(moodOf(mainState({ current: 0, players: [{ active: ICHIKA }, { active: NINO }] }))).toBe('your-turn');
    expect(moodOf(mainState({ current: 1, players: [{ active: ICHIKA }, { active: NINO }] }))).toBe('their-turn');
  });

  it('shows a question only to the player who has to answer it', () => {
    const state = mainState({
      players: [{ hand: ['TQQ01-067'], active: { stack: ['TQQ01-001'], damage: 10 }, bench: [{ stack: ['TQQ01-013'], damage: 10 }] }, { active: NINO }],
    });
    const asked = play(state, { type: 'play-supporter', handIndex: 0 }).state;
    expect(promptFor(asked, 0)?.title).toBe('Choose a Character to heal');
    expect(promptFor(asked, 1)).toBeNull();
    expect(promptFor(state, 0)).toBeNull();
  });
});
