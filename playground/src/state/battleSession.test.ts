import { describe, expect, it } from 'vitest';
import { createAi } from '../battle/ai';
import { legalActions } from '../battle/legal';
import { observe } from '../battle/observe';
import type { BattleOutcome, Payout } from '../battle/rewards';
import { OPPONENTS, STARTER_DECKS } from '../battle/roster';
import { createBattleSession, type SessionStore } from './battleSession';

const RIVAL = OPPONENTS[0];
const STARTER = STARTER_DECKS[0];
if (RIVAL === undefined || STARTER === undefined) {
  throw new Error('The deck roster is empty.');
}
const DECK = { name: STARTER.name, cards: STARTER.cards, loaner: true } as const;

function makeSession(seed = 'session') {
  const queue: { run: () => void; delay: number }[] = [];
  const outcomes: BattleOutcome[] = [];
  const payout: Payout = { yen: 123, base: 100, bonus: 23 };
  const store = createBattleSession({
    seed: () => seed,
    schedule: (run, delay) => {
      const entry = { run, delay };
      queue.push(entry);
      return () => {
        const at = queue.indexOf(entry);
        if (at >= 0) {
          queue.splice(at, 1);
        }
      };
    },
    settle: (outcome) => {
      outcomes.push(outcome);
      return payout;
    },
  });
  return {
    store,
    outcomes,
    payout,
    scheduled: () => queue.length,
    /** Lets the rival do its next planned action. */
    flush: () => queue.shift()?.run(),
  };
}

/** Plays the player's side with a computer opponent until the battle is over. */
function playToEnd(store: SessionStore, flush: () => void): void {
  const bot = createAi('normal', 'player');
  for (let count = 0; count < 6000 && store.getState().status === 'playing'; count += 1) {
    const { battle, waiting } = store.getState();
    if (battle === null) {
      return;
    }
    if (waiting) {
      flush();
    } else {
      store.getState().act(bot.choose(observe(battle, 0), 0));
    }
  }
}

describe('the battle session', () => {
  it('starts a battle: the rival is set up at once, the player is next', () => {
    const { store } = makeSession();
    expect(store.getState().status).toBe('idle');
    store.getState().start(RIVAL, DECK);
    const state = store.getState();
    expect(state.status).toBe('playing');
    expect(state.rival).toBe(RIVAL);
    expect(state.battle?.phase).toBe('setup');
    expect(state.battle?.players[1].setupDone).toBe(true);
    expect(state.battle?.players[0].setupDone).toBe(false);
    expect(state.battle !== null && legalActions(state.battle, 0).length).toBeGreaterThan(0);
    expect(state.waiting).toBe(false);
    expect(state.log.length).toBeGreaterThan(0);
  });

  it('lets the rival move after a pause once the player is done, and ignores the player meanwhile', () => {
    const { store, flush, scheduled } = makeSession('rival-first');
    store.getState().start(RIVAL, DECK);
    const bot = createAi('hard', 'setup');
    // The player's setup.
    for (let count = 0; count < 8 && store.getState().battle?.phase === 'setup'; count += 1) {
      const battle = store.getState().battle;
      if (battle !== null) {
        store.getState().act(bot.choose(observe(battle, 0), 0));
      }
    }
    const battle = store.getState().battle;
    expect(battle?.phase).toBe('main');
    if (battle?.current === 1) {
      expect(store.getState().waiting).toBe(true);
      expect(scheduled()).toBe(1);
      const before = store.getState().battle;
      store.getState().act({ type: 'end-turn' });
      expect(store.getState().battle).toBe(before);
      flush();
      expect(store.getState().battle).not.toBe(before);
    } else {
      expect(store.getState().waiting).toBe(false);
    }
  });

  it('plays a whole battle, pays out once and tells the result', () => {
    const { store, flush, outcomes, payout } = makeSession('whole-battle');
    store.getState().start(RIVAL, DECK);
    playToEnd(store, flush);
    const state = store.getState();
    expect(state.status).toBe('over');
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ rivalId: RIVAL.id, level: RIVAL.level, gaveUp: false });
    expect(state.result?.payout).toBe(payout);
    const winner = state.battle?.winner;
    expect(state.result?.outcome).toBe(winner === 0 ? 'win' : winner === 1 ? 'loss' : 'draw');
    expect(state.log.some((line) => line.heading)).toBe(true);
    expect(state.waiting).toBe(false);
  }, 60_000);

  it('counts giving up as a loss that is not paid', () => {
    const { store, outcomes } = makeSession('give-up');
    store.getState().start(RIVAL, DECK);
    store.getState().giveUp();
    expect(store.getState().status).toBe('over');
    expect(outcomes).toEqual([{ rivalId: RIVAL.id, level: RIVAL.level, result: 'loss', gaveUp: true }]);
    expect(store.getState().result?.gaveUp).toBe(true);
    store.getState().giveUp();
    expect(outcomes).toHaveLength(1);
  });

  it('forgets the battle when it is left, and a new one replaces one that is still going', () => {
    const { store, scheduled } = makeSession('leave');
    store.getState().start(RIVAL, DECK);
    store.getState().leave();
    expect(store.getState().status).toBe('idle');
    expect(store.getState().battle).toBeNull();
    expect(scheduled()).toBe(0);
    store.getState().start(RIVAL, DECK);
    const first = store.getState().battle;
    store.getState().start(RIVAL, DECK);
    expect(store.getState().battle).not.toBe(first);
    expect(scheduled()).toBe(0);
  });

  it('is repeatable: the same seed and the same choices give the same battle', () => {
    const run = () => {
      const { store, flush } = makeSession('repeat');
      store.getState().start(RIVAL, DECK);
      playToEnd(store, flush);
      return store.getState().battle;
    };
    expect(run()).toEqual(run());
  }, 60_000);
});
