// The battle that is being played right now: the engine's state plus everything a screen needs around it (the log, what the
// last step did, whether the opponent is acting, the result). The player is always player 0, the rival is player 1 and
// is driven here, one action at a time with a short pause so the player can follow what happens. A battle is not saved:
// closing the page ends it. Built by a factory so tests can bring their own clock and rules for paying out.

import { createStore, type StoreApi } from 'zustand/vanilla';
import { createAi, type Ai } from '../battle/ai';
import { describeEvent, type Names } from '../battle/describe';
import { createBattle, step } from '../battle/engine';
import { legalActions, playerToAct } from '../battle/legal';
import { observe } from '../battle/observe';
import type { BattleOutcome, Payout } from '../battle/rewards';
import type { Opponent } from '../battle/roster';
import type { BattleAction, BattleEvent, BattleState, EndReason, PlayerIndex } from '../battle/types';

export interface PlayerDeckInfo {
  readonly name: string;
  readonly cards: readonly string[];
  /** A loaner deck (not made of the player's own cards). */
  readonly loaner: boolean;
}

export interface LogLine {
  readonly id: number;
  readonly text: string;
  /** Who it is about, so the screen can colour the line. */
  readonly side: 'you' | 'them' | 'neutral';
  /** The first line of every turn. */
  readonly heading: boolean;
}

export interface BattleResultInfo {
  readonly outcome: 'win' | 'loss' | 'draw';
  readonly reason: EndReason;
  readonly gaveUp: boolean;
  readonly payout: Payout;
  readonly turns: number;
  readonly memories: readonly [number, number];
}

/** What the last step did, for the animations of the screen. `tick` grows with every step. */
export interface FlashState {
  readonly tick: number;
  readonly events: readonly BattleEvent[];
  readonly by: PlayerIndex | null;
}

export interface SessionState {
  readonly status: 'idle' | 'playing' | 'over';
  readonly rival: Opponent | null;
  readonly deck: PlayerDeckInfo | null;
  readonly battle: BattleState | null;
  readonly log: readonly LogLine[];
  readonly flash: FlashState;
  /** The rival is acting; the player has to wait. */
  readonly waiting: boolean;
  readonly result: BattleResultInfo | null;
}

export interface SessionActions {
  /** Starts a battle against `rival` with the player's deck. The rival's setup is done at once; the player sets up next. */
  start(rival: Opponent, deck: PlayerDeckInfo): void;
  /** One action of the player. A refused action changes nothing. */
  act(action: BattleAction): void;
  /** The player gives up: the battle is lost and pays nothing. */
  giveUp(): void;
  /** Closes a finished battle (or forgets one that is still going) and goes back to "no battle". */
  leave(): void;
}

export type SessionStore = StoreApi<SessionState & SessionActions>;

export interface SessionDeps {
  readonly seed: () => string;
  /** Runs `run` after `delayMs`; returns a function that cancels it. */
  readonly schedule: (run: () => void, delayMs: number) => () => void;
  /** Writes the result into the save game and says what was paid. */
  readonly settle: (outcome: BattleOutcome) => Payout;
  /** How quickly the rival moves: 1 is the normal pace, smaller is faster. */
  readonly pace?: () => number;
}

/** Pause before the rival's next action, by what it is about to do. */
const THINK_MS: Readonly<Record<BattleAction['type'], number>> = {
  'setup-place': 0,
  'setup-done': 0,
  'play-basic': 650,
  evolve: 750,
  'give-heart': 550,
  'play-supporter': 900,
  'use-ability': 800,
  retreat: 750,
  attack: 1100,
  'end-turn': 550,
  choose: 600,
  concede: 0,
};

function namesFor(rival: Opponent): Names {
  const first = rival.name.split(' ')[0] ?? rival.name;
  return {
    subject: (player) => (player === 0 ? 'You' : first),
    possessive: (player) => (player === 0 ? 'your' : `${first}'s`),
  };
}

function sideOf(event: BattleEvent): LogLine['side'] {
  switch (event.type) {
    case 'coin':
    case 'over':
      return 'neutral';
    case 'attack':
      return event.player === 0 ? 'you' : 'them';
    case 'swap':
    case 'survive':
    case 'knock-out':
    case 'promote':
      return 'neutral';
    default:
      return event.player === 0 ? 'you' : 'them';
  }
}

const IDLE: SessionState = {
  status: 'idle',
  rival: null,
  deck: null,
  battle: null,
  log: [],
  flash: { tick: 0, events: [], by: null },
  waiting: false,
  result: null,
};

export function createBattleSession(deps: SessionDeps): SessionStore {
  let ai: Ai | null = null;
  let cancel: (() => void) | null = null;
  let gaveUp = false;
  let lineId = 0;

  return createStore<SessionState & SessionActions>()((set, get) => {
    function logLines(events: readonly BattleEvent[], rival: Opponent): LogLine[] {
      const names = namesFor(rival);
      const lines: LogLine[] = [];
      for (const event of events) {
        const text = describeEvent(event, names);
        if (text !== null) {
          lineId += 1;
          lines.push({ id: lineId, text, side: sideOf(event), heading: event.type === 'turn' });
        }
      }
      return lines;
    }

    function finish(battle: BattleState, rival: Opponent): void {
      const outcome = battle.winner === 0 ? 'win' : battle.winner === 1 ? 'loss' : 'draw';
      const payout = deps.settle({ rivalId: rival.id, level: rival.level, result: outcome, gaveUp });
      set({
        status: 'over',
        waiting: false,
        result: {
          outcome,
          reason: battle.endReason ?? 'memories',
          gaveUp,
          payout,
          turns: battle.turn,
          memories: [battle.players[0].memories, battle.players[1].memories],
        },
      });
    }

    /** Applies one action of `by`. Returns false when the engine refused it. */
    function apply(action: BattleAction, by: PlayerIndex): boolean {
      const { battle, rival, log, flash } = get();
      if (battle === null || rival === null) {
        return false;
      }
      const result = step(battle, action);
      if (!result.ok) {
        return false;
      }
      set({
        battle: result.state,
        log: [...log, ...logLines(result.events, rival)].slice(-400),
        flash: { tick: flash.tick + 1, events: result.events, by },
      });
      if (result.state.phase === 'over') {
        finish(result.state, rival);
      }
      return true;
    }

    /** Lets the rival do `action` now. When the engine refuses it, the first allowed action is done instead, so it never gets stuck. */
    function rivalActs(action: BattleAction): void {
      cancel = null;
      const { battle, status } = get();
      if (battle === null || status !== 'playing' || playerToAct(battle) !== 1) {
        return;
      }
      if (!apply(action, 1)) {
        const fallback = legalActions(battle, 1)[0];
        if (fallback === undefined || !apply(fallback, 1)) {
          apply({ type: 'concede', player: 1 }, 1);
        }
      }
      drive();
    }

    /** Hands the battle to whoever has to act: waits for the player, or lets the rival move after a short pause. */
    function drive(): void {
      cancel?.();
      cancel = null;
      const { battle, status } = get();
      if (battle === null || status !== 'playing') {
        return;
      }
      if (playerToAct(battle) === 1 && ai !== null) {
        const action = ai.choose(observe(battle, 1), 1);
        set({ waiting: true });
        cancel = deps.schedule(() => rivalActs(action), THINK_MS[action.type] * (deps.pace?.() ?? 1));
      } else {
        set({ waiting: false });
      }
    }

    /** The rival's setup does not depend on what the player does, so it happens at once. */
    function setUpRival(): void {
      const { rival } = get();
      for (let count = 0; count < 12; count += 1) {
        const battle = get().battle;
        if (battle === null || rival === null || ai === null || battle.phase !== 'setup' || battle.players[1].setupDone) {
          return;
        }
        if (legalActions(battle, 1).length === 0 || !apply(ai.choose(observe(battle, 1), 1), 1)) {
          return;
        }
      }
    }

    return {
      ...IDLE,

      start(rival, deck) {
        cancel?.();
        cancel = null;
        gaveUp = false;
        const seed = deps.seed();
        const created = createBattle({ decks: [deck.cards, rival.deck.cards], seed });
        if (!created.ok) {
          throw new Error(created.error);
        }
        ai = createAi(rival.level, seed);
        set({
          ...IDLE,
          status: 'playing',
          rival,
          deck,
          battle: created.state,
          log: logLines(created.events, rival),
          flash: { tick: 1, events: created.events, by: null },
        });
        setUpRival();
        drive();
      },

      act(action) {
        const { battle, status, waiting } = get();
        if (battle === null || status !== 'playing' || (waiting && battle.phase !== 'setup')) {
          return;
        }
        if (apply(action, 0)) {
          drive();
        }
      },

      giveUp() {
        const { battle, status } = get();
        if (battle === null || status !== 'playing') {
          return;
        }
        gaveUp = true;
        cancel?.();
        cancel = null;
        apply({ type: 'concede', player: 0 }, 0);
      },

      leave() {
        cancel?.();
        cancel = null;
        ai = null;
        set({ ...IDLE });
      },
    };
  });
}
