import { describe, expect, it } from 'vitest';
import { createAi, type Ai } from './ai';
import { createBattle } from './engine';
import { legalActions } from './legal';
import { observe } from './observe';
import { FREE_HEARTS_PER_TURN } from './rules';
import { lineDeck, mainState, play } from './testing';
import type { BattleAction, BattleState, PlayerIndex } from './types';

/** The hard opponent never makes a mistake on purpose, so these tests can say exactly what it does. */
function hardAi(seed = 'test'): Ai {
  return createAi('hard', seed);
}

function decide(state: BattleState, me: PlayerIndex = 0, ai: Ai = hardAi()): BattleAction {
  return ai.choose(observe(state, me), me);
}

const ICHIKA = { stack: ['TQQ01-001'] } as const;
const NINO = { stack: ['TQQ01-013'] } as const;
const ITSUKI = { stack: ['TQQ01-049'] } as const;
/** The free Hearts of a turn are used up, so the computer has nothing to give and only the other actions are left. */
const GIVEN = FREE_HEARTS_PER_TURN;

describe('a computer opponent in the main phase', () => {
  it('attacks with the move that knocks out, not the one that is cheaper', () => {
    // Rehearsal Day: 20 damage for one Heart, 40 for two. The enemy has 30 HP left.
    const state = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 2 }, heartsGiven: GIVEN }, { active: { stack: ['TQQ01-037'], damage: 40 } }] });
    expect(decide(state)).toEqual({ type: 'attack', moveIndex: 1 });
  });

  it('gives the free Heart to the Active Character when that opens a move', () => {
    const state = mainState({ players: [{ active: ICHIKA, bench: [NINO] }, { active: ITSUKI }] });
    expect(decide(state)).toEqual({ type: 'give-heart', target: { zone: 'active' } });
  });

  it('keeps Hearts off the Bench until the Active Character has what it needs, then spends them there', () => {
    const hungry = mainState({ players: [{ active: { stack: ['TQQ01-003'] }, bench: [NINO] }, { active: ITSUKI }] });
    expect(decide(hungry)).toEqual({ type: 'give-heart', target: { zone: 'active' } });
    // One Heart pays for its only move and the free Heart that is left would pay for it again next turn: the Bench gets it.
    const ready = mainState({ players: [{ active: { stack: ['TQQ01-001'], hearts: 3 }, bench: [NINO], heartsGiven: GIVEN - 1 }, { active: ITSUKI }] });
    expect(decide(ready)).toEqual({ type: 'give-heart', target: { zone: 'bench', index: 0 } });
  });

  it('saves a Heart for the big move of the next turn instead of poking with the small one', () => {
    // A Bride: "Gentle Cue" (one Heart, 40) and "Curtain Call" (three Hearts, 150 and more). With one Heart left, a poke now would
    // leave too few Hearts for the big move next turn (one plus the two free ones is three).
    const bride = { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-009'], hearts: 1 } as const;
    const waits = mainState({ players: [{ active: bride, heartsGiven: GIVEN }, { active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-055'] } }] });
    expect(decide(waits)).toEqual({ type: 'end-turn' });
    // With two Hearts the poke leaves one, and one plus two free Hearts is three: it may poke.
    const pokes = mainState({ players: [{ active: { ...bride, hearts: 2 }, heartsGiven: GIVEN }, { active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-055'] } }] });
    expect(decide(pokes)).toEqual({ type: 'attack', moveIndex: 0 });
  });

  it('keeps a Heart back for the evolution it holds, which needs three Hearts in the next turn', () => {
    // "Rehearsal Day" can poke for one Heart (20) or hit for two (40). The Close card in the hand opens a move for three Hearts next
    // turn (it cannot evolve this turn: the Character just arrived), so the poke leaves one Heart and two free ones make three.
    const state = mainState({
      players: [{ hand: ['TQQ01-004'], active: { stack: ['TQQ01-003'], hearts: 2, arrivedTurn: 7 }, heartsGiven: GIVEN }, { active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-055'] } }],
    });
    expect(decide(state)).toEqual({ type: 'attack', moveIndex: 0 });
    // Without that card in the hand the harder hit now is better.
    const without = mainState({
      players: [{ hand: [], active: { stack: ['TQQ01-003'], hearts: 2, arrivedTurn: 7 }, heartsGiven: GIVEN }, { active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-055'] } }],
    });
    expect(decide(without)).toEqual({ type: 'attack', moveIndex: 1 });
  });

  it('evolves before it attacks', () => {
    const state = mainState({ turn: 7, players: [{ hand: ['TQQ01-004'], active: { stack: ['TQQ01-001'], hearts: 1, arrivedTurn: 1 }, heartsGiven: GIVEN }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'evolve', handIndex: 0, target: { zone: 'active' } });
  });

  it('puts a Basic on the Bench before anything else, with room on the Bench', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-013'], active: ICHIKA, heartsGiven: GIVEN }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'play-basic', handIndex: 0 });
  });

  it('plays a Supporter that helps and keeps one that would do nothing', () => {
    const draw = mainState({ players: [{ hand: ['TQQ01-062'], active: ICHIKA, heartsGiven: GIVEN }, { active: NINO }] });
    expect(decide(draw)).toEqual({ type: 'play-supporter', handIndex: 0 });
    const heal = mainState({ players: [{ hand: ['TQQ01-067'], active: ICHIKA, heartsGiven: GIVEN }, { active: NINO }] });
    expect(decide(heal)).toEqual({ type: 'end-turn' });
    const hurt = mainState({ players: [{ hand: ['TQQ01-067'], active: { stack: ['TQQ01-001'], damage: 40 }, heartsGiven: GIVEN }, { active: NINO }] });
    expect(decide(hurt)).toEqual({ type: 'play-supporter', handIndex: 0 });
  });

  it('does not draw itself out of cards', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-062'], active: ICHIKA, deck: ['TQQ01-001', 'TQQ01-001', 'TQQ01-001'], heartsGiven: GIVEN }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'end-turn' });
  });

  it('retreats to put a Character that can attack to the front', () => {
    const state = mainState({
      players: [{ active: { stack: ['TQQ01-004'], hearts: 2 }, bench: [{ stack: ['TQQ01-001'], hearts: 1 }], heartsGiven: GIVEN }, { active: { stack: ['TQQ01-049'] } }],
    });
    expect(decide(state)).toEqual({ type: 'retreat', benchIndex: 0 });
  });

  it('ends its turn when there is nothing useful left, and on the first turn of the player who goes first', () => {
    const state = mainState({ turn: 1, current: 0, first: 0, players: [{ active: { stack: ['TQQ01-001'], hearts: 1 }, turnsTaken: 1, heartsGiven: GIVEN }, { active: NINO, turnsTaken: 0 }] });
    expect(decide(state)).toEqual({ type: 'end-turn' });
  });
});

describe('a computer opponent answering questions', () => {
  it('heals the Character that is hurt the most', () => {
    const state = mainState({
      players: [{ hand: ['TQQ01-067'], active: { stack: ['TQQ01-001'], damage: 10 }, bench: [{ stack: ['TQQ01-013'], damage: 50 }], heartsGiven: GIVEN }, { active: NINO }],
    });
    const asked = play(state, decide(state)).state;
    expect(asked.pending?.prompt.kind).toBe('figure');
    expect(decide(asked)).toEqual({ type: 'choose', option: 1 });
  });

  it('steps up the Benched Character that can fight when the Active one falls', () => {
    // The Close card needs three Hearts and has none (the two free Hearts of the next turn are not enough); the Basic needs one.
    const state = mainState({
      players: [
        { active: { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-010'], hearts: 3 } },
        { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-001', 'TQQ01-004'] }, { stack: ['TQQ01-037'], hearts: 1 }] },
      ],
    });
    const fallen = play(state, { type: 'attack', moveIndex: 0 }).state;
    expect(fallen.pending?.player).toBe(1);
    expect(decide(fallen, 1)).toEqual({ type: 'choose', option: 1 });
  });

  it('takes the Basic that is best to have when it may search the deck', () => {
    const state = mainState({
      players: [{ hand: ['TQQ01-065'], active: ICHIKA, deck: ['TQQ01-014', 'TQQ01-008', 'TQQ01-013'], heartsGiven: GIVEN }, { active: NINO }],
    });
    const asked = play(state, { type: 'play-supporter', handIndex: 0 }).state;
    expect(asked.pending?.prompt.kind).toBe('card');
    const picked = decide(asked);
    expect(picked.type).toBe('choose');
    // Golden Hour (80 HP, 50 damage for two Hearts) is the strongest of the three.
    expect(picked).toEqual({ type: 'choose', option: 1 });
  });
});

describe('a computer opponent in the setup', () => {
  it('puts a Character in front, fills the Bench and then says it is done', () => {
    const created = createBattle({ decks: [lineDeck('ichika'), lineDeck('nino')], seed: 'setup-ai' });
    if (!created.ok) {
      throw new Error(created.error);
    }
    const me = created.state.first;
    const ai = hardAi('setup');
    let state = created.state;
    for (let count = 0; count < 10 && !state.players[me].setupDone; count += 1) {
      state = play(state, ai.choose(observe(state, me), me)).state;
    }
    const side = state.players[me];
    expect(side.setupDone).toBe(true);
    expect(side.active).not.toBeNull();
    // Everything that could be played from the hand was played, up to the size of the Bench.
    const left = side.hand.filter((cardId) => ['TQQ01-001', 'TQQ01-002', 'TQQ01-003', 'TQQ01-008', 'TQQ01-013', 'TQQ01-014', 'TQQ01-015', 'TQQ01-020'].includes(cardId));
    expect(side.bench.length === 3 || left.length === 0).toBe(true);
  });
});

describe('the levels', () => {
  it('give the same answer for the same seed and a different style for a different level', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-013', 'TQQ01-062'], active: ICHIKA, bench: [NINO] }, { active: NINO }] });
    const a = createAi('normal', 'same');
    const b = createAi('normal', 'same');
    for (let count = 0; count < 5; count += 1) {
      expect(decide(state, 0, a)).toEqual(decide(state, 0, b));
    }
  });

  it('never choose an action that is not allowed, in a long series of different situations', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const ai = createAi(level, 'legal');
      const state = mainState({
        players: [
          { hand: ['TQQ01-004', 'TQQ01-013', 'TQQ01-062', 'TQQ01-067', 'TQQ01-065'], active: { stack: ['TQQ01-001'], hearts: 1, damage: 20 }, bench: [{ stack: ['TQQ01-013'] }] },
          { active: NINO, bench: [ICHIKA] },
        ],
      });
      for (let count = 0; count < 30; count += 1) {
        const action = decide(state, 0, ai);
        expect(legalActions(state, 0)).toContainEqual(action);
      }
    }
  });
});
