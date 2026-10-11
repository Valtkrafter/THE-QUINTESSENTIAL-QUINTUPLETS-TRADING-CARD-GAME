import { describe, expect, it } from 'vitest';
import { createRng } from '../domain/random';
import { createBattle, step } from './engine';
import { legalActions } from './legal';
import { invariantProblems, randomPlayout, simpleDeck, startedBattle } from './testing';

const NAMES = ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'] as const;

describe('random battles', () => {
  it('always end, and never break a rule on the way', () => {
    const reasons = new Map<string, number>();
    for (let game = 0; game < 40; game += 1) {
      const a = NAMES[game % NAMES.length] ?? 'ichika';
      const b = NAMES[(game * 3 + 1) % NAMES.length] ?? 'nino';
      const chance = createRng(`fuzz-${game}`);
      const playout = randomPlayout({ decks: [simpleDeck(a), simpleDeck(b)], seed: `game-${game}` }, chance, (state) => {
        const problems = invariantProblems(state);
        if (problems.length > 0) {
          throw new Error(`game ${game}: ${problems.join('; ')}`);
        }
      });
      expect(playout.state.phase, `game ${game}`).toBe('over');
      const reason = playout.state.endReason ?? 'none';
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
    // Random play knocks Characters out and also wears decks down; both kinds of ending must work.
    expect([...reasons.keys()].length).toBeGreaterThan(0);
  }, 60_000);

  it('replay the same way from the same seed and the same choices', () => {
    const decks = [simpleDeck('ichika'), simpleDeck('miku')] as const;
    const first = randomPlayout({ decks, seed: 'replay' }, createRng('choices'));
    const second = randomPlayout({ decks, seed: 'replay' }, createRng('choices'));
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
  });

  it('never offer an action that the engine then refuses', () => {
    let state = startedBattle({ decks: [simpleDeck('yotsuba'), simpleDeck('itsuki')], seed: 'offers' });
    const chance = createRng('offers');
    for (let count = 0; count < 600 && state.phase !== 'over'; count += 1) {
      const actor = state.pending?.player ?? state.current;
      const actions = legalActions(state, actor);
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(step(state, action).ok, JSON.stringify(action)).toBe(true);
      }
      const picked = chance.pick(actions.filter((action) => action.type !== 'end-turn' || chance.next() < 0.2).concat(actions.slice(-1)));
      const result = step(state, picked);
      if (!result.ok) {
        throw new Error(result.error);
      }
      state = result.state;
    }
  }, 60_000);

  it('does not change the state it is given', () => {
    const created = createBattle({ decks: [simpleDeck('nino'), simpleDeck('miku')], seed: 'frozen' });
    if (!created.ok) {
      throw new Error(created.error);
    }
    const before = JSON.stringify(created.state);
    for (const action of legalActions(created.state, created.state.first)) {
      step(created.state, action);
    }
    expect(JSON.stringify(created.state)).toBe(before);
  });
});
