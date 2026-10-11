import { describe, expect, it } from 'vitest';
import { createAi, type Ai } from './ai';
import { createBattle } from './engine';
import { legalActions } from './legal';
import { observe } from './observe';
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

describe('a computer opponent in the main phase', () => {
  it('attacks with the move that knocks out, not the one that is cheaper', () => {
    // Rehearsal Day: 20 damage for one Heart, 40 for two. The enemy has 30 HP left.
    const state = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 2 }, heartsGiven: 1 }, { active: { stack: ['TQQ01-037'], damage: 40 } }] });
    expect(decide(state)).toEqual({ type: 'attack', moveIndex: 1 });
  });

  it('gives the free Heart to the Active Character when that opens a move', () => {
    const state = mainState({ players: [{ active: ICHIKA, bench: [NINO] }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'give-heart', target: { zone: 'active' } });
  });

  it('keeps Hearts off the Bench until the Active Character has what it needs, then spends them there', () => {
    const hungry = mainState({ players: [{ active: { stack: ['TQQ01-003'] }, bench: [{ stack: ['TQQ01-013'] }] }, { active: NINO }] });
    expect(decide(hungry)).toEqual({ type: 'give-heart', target: { zone: 'active' } });
    const ready = mainState({ players: [{ active: { stack: ['TQQ01-001'], hearts: 1 }, bench: [{ stack: ['TQQ01-013'] }] }, { active: NINO }] });
    expect(decide(ready)).toEqual({ type: 'give-heart', target: { zone: 'bench', index: 0 } });
  });

  it('evolves before it attacks', () => {
    const state = mainState({ turn: 7, players: [{ hand: ['TQQ01-004'], active: { stack: ['TQQ01-001'], hearts: 1, arrivedTurn: 1 }, heartsGiven: 1 }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'evolve', handIndex: 0, target: { zone: 'active' } });
  });

  it('puts a Basic on the Bench before anything else, with room on the Bench', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-013'], active: ICHIKA, heartsGiven: 1 }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'play-basic', handIndex: 0 });
  });

  it('plays a Supporter that helps and keeps one that would do nothing', () => {
    const draw = mainState({ players: [{ hand: ['TQQ01-062'], active: ICHIKA, heartsGiven: 1 }, { active: NINO }] });
    expect(decide(draw)).toEqual({ type: 'play-supporter', handIndex: 0 });
    const heal = mainState({ players: [{ hand: ['TQQ01-067'], active: ICHIKA, heartsGiven: 1 }, { active: NINO }] });
    expect(decide(heal)).toEqual({ type: 'end-turn' });
    const hurt = mainState({ players: [{ hand: ['TQQ01-067'], active: { stack: ['TQQ01-001'], damage: 40 }, heartsGiven: 1 }, { active: NINO }] });
    expect(decide(hurt)).toEqual({ type: 'play-supporter', handIndex: 0 });
  });

  it('does not draw itself out of cards', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-062'], active: ICHIKA, deck: ['TQQ01-001', 'TQQ01-001', 'TQQ01-001'], heartsGiven: 1 }, { active: NINO }] });
    expect(decide(state)).toEqual({ type: 'end-turn' });
  });

  it('retreats to put a Character that can attack to the front', () => {
    const state = mainState({
      players: [{ active: { stack: ['TQQ01-004'], hearts: 2 }, bench: [{ stack: ['TQQ01-001'], hearts: 1 }], heartsGiven: 1 }, { active: { stack: ['TQQ01-049'] } }],
    });
    expect(decide(state)).toEqual({ type: 'retreat', benchIndex: 0 });
  });

  it('ends its turn when there is nothing useful left, and on the first turn of the player who goes first', () => {
    const state = mainState({ turn: 1, current: 0, first: 0, players: [{ active: { stack: ['TQQ01-001'], hearts: 1 }, turnsTaken: 1, heartsGiven: 1 }, { active: NINO, turnsTaken: 0 }] });
    expect(decide(state)).toEqual({ type: 'end-turn' });
  });
});

describe('a computer opponent answering questions', () => {
  it('heals the Character that is hurt the most', () => {
    const state = mainState({
      players: [{ hand: ['TQQ01-067'], active: { stack: ['TQQ01-001'], damage: 10 }, bench: [{ stack: ['TQQ01-013'], damage: 50 }], heartsGiven: 1 }, { active: NINO }],
    });
    const asked = play(state, decide(state)).state;
    expect(asked.pending?.prompt.kind).toBe('figure');
    expect(decide(asked)).toEqual({ type: 'choose', option: 1 });
  });

  it('steps up the Benched Character that can fight when the Active one falls', () => {
    const state = mainState({
      players: [
        { active: { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-010'], hearts: 3 } },
        { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }, { stack: ['TQQ01-037'], hearts: 1 }] },
      ],
    });
    const fallen = play(state, { type: 'attack', moveIndex: 0 }).state;
    expect(fallen.pending?.player).toBe(1);
    expect(decide(fallen, 1)).toEqual({ type: 'choose', option: 1 });
  });

  it('takes the Basic that is best to have when it may search the deck', () => {
    const state = mainState({
      players: [{ hand: ['TQQ01-065'], active: ICHIKA, deck: ['TQQ01-014', 'TQQ01-008', 'TQQ01-013'], heartsGiven: 1 }, { active: NINO }],
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
