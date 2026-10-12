import { describe, expect, it } from 'vitest';
import { legalActions } from '../../battle/legal';
import { mainState, play } from '../../battle/testing';
import { costDots, figureOptions, handOptions, heartsLeft, isPlayable, moodOf, moveViews, promptFor } from './viewModel';

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
    const one = play(state, { type: 'give-heart', target: { zone: 'active' } }).state;
    expect(figureOptions(legalActions(one, 0), { zone: 'active' }).giveHeart).not.toBeNull();
    const used = play(one, { type: 'give-heart', target: { zone: 'active' } }).state;
    expect(figureOptions(legalActions(used, 0), { zone: 'active' }).giveHeart).toBeNull();
    expect(heartsLeft(state, 0)).toBe(2);
    expect(heartsLeft(one, 0)).toBe(1);
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

describe('the Hearts of a move cost', () => {
  it('are paid one after the other by the Hearts the Character holds, the grey one by any of them', () => {
    // Ichika holds 3 Hearts of her own kind, and "Rehearsal" costs one of those and one grey Heart: both are paid.
    expect(costDots(['heart', 'study'], 3, 0)).toEqual([
      { kind: 'heart', state: 'paid' },
      { kind: 'study', state: 'paid' },
    ]);
    expect(costDots(['heart', 'study'], 2, 0).map((dot) => dot.state)).toEqual(['paid', 'paid']);
    expect(costDots(['heart', 'study'], 1, 0).map((dot) => dot.state)).toEqual(['paid', 'open']);
    expect(costDots(['heart', 'study'], 0, 0).map((dot) => dot.state)).toEqual(['open', 'open']);
    expect(costDots([], 2, 0)).toEqual([]);
  });

  it('are free for the grey ones that a Bench ability pays for, the last grey ones first', () => {
    expect(costDots(['clover', 'study'], 1, 1).map((dot) => dot.state)).toEqual(['paid', 'free']);
    expect(costDots(['clover', 'study'], 0, 1).map((dot) => dot.state)).toEqual(['open', 'free']);
    expect(costDots(['study', 'clover'], 1, 1).map((dot) => dot.state)).toEqual(['free', 'paid']);
    expect(costDots(['clover', 'study', 'study'], 2, 1).map((dot) => dot.state)).toEqual(['paid', 'paid', 'free']);
    // A discount only reaches the grey Hearts, however big it is.
    expect(costDots(['clover', 'study'], 0, 5).map((dot) => dot.state)).toEqual(['open', 'free']);
  });

  it('go with the moves: the Hearts on the card show which move can be used, and say why not', () => {
    const rich = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 3 } }, { active: NINO }] });
    const rehearsal = moveViews(rich, 0, legalActions(rich, 0))[1];
    expect(rehearsal).toMatchObject({ name: 'Rehearsal', usable: true, heartsNeeded: 2 });
    expect(rehearsal?.dots.map((dot) => dot.state)).toEqual(['paid', 'paid']);
    const poor = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 1 } }, { active: NINO }] });
    const short = moveViews(poor, 0, legalActions(poor, 0))[1];
    expect(short).toMatchObject({ usable: false, heartsNeeded: 2 });
    expect(short?.dots.map((dot) => dot.state)).toEqual(['paid', 'open']);
  });

  it('count a Bench ability that pays for the grey Heart', () => {
    // Yotsuba's "Sunny Dash" costs a clover and a grey Heart; with "Ribbon of Support" on the Bench one Heart is enough.
    const state = mainState({ players: [{ active: { stack: ['TQQ01-044'], hearts: 1 }, bench: [{ stack: ['TQQ01-041'] }] }, { active: NINO }] });
    const dash = moveViews(state, 0, legalActions(state, 0))[0];
    expect(dash).toMatchObject({ name: 'Sunny Dash', usable: true, heartsNeeded: 1 });
    expect(dash?.dots.map((dot) => dot.state)).toEqual(['paid', 'free']);
  });
});

describe('the state of the battle', () => {
  it('says whose turn it is', () => {
    expect(moodOf(mainState({ current: 0, players: [{ active: ICHIKA }, { active: NINO }] }))).toBe('your-turn');
    expect(moodOf(mainState({ current: 1, players: [{ active: ICHIKA }, { active: NINO }] }))).toBe('their-turn');
  });

  it('belongs to whoever has to answer a question, also in the turn of the other player', () => {
    // The rival's Active Character is knocked out by an attack of the player: the rival has to choose who steps up.
    const state = mainState({
      current: 0,
      players: [{ hand: [], active: { stack: ['TQQ01-001'], hearts: 3 } }, { active: { stack: ['TQQ01-001'], damage: 69 }, bench: [{ stack: ['TQQ01-013'] }, { stack: ['TQQ01-001'] }] }],
    });
    const attacked = play(state, { type: 'attack', moveIndex: 0 }).state;
    expect(attacked.pending?.player).toBe(1);
    expect(moodOf(attacked)).toBe('their-turn');
    expect(moodOf(state)).toBe('your-turn');
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
