// Plays whole battles between two computer opponents. Used by the tests, and by the balance report that tunes the decks
// and the opponents (see balance.test.ts): how long battles last, who wins, how they end.

import { createAi, type AiLevel } from './ai';
import { createBattle, step } from './engine';
import { playerToAct } from './legal';
import { observe } from './observe';
import type { BattleEvent, BattleState, EndReason, PlayerIndex } from './types';

export interface MatchSetup {
  readonly decks: readonly [readonly string[], readonly string[]];
  readonly levels: readonly [AiLevel, AiLevel];
  readonly seed: string;
  readonly first?: PlayerIndex;
}

export interface MatchResult {
  readonly winner: PlayerIndex | 'draw';
  readonly reason: EndReason;
  /** Turns of both players together. */
  readonly turns: number;
  readonly actions: number;
  readonly memories: readonly [number, number];
  readonly first: PlayerIndex;
  readonly mulligans: readonly [number, number];
  readonly state: BattleState;
}

const MAX_ACTIONS = 5000;

/** Plays one battle to the end. Throws when a computer opponent does something the rules refuse. */
export function playMatch(setup: MatchSetup, watch?: (events: readonly BattleEvent[], state: BattleState) => void): MatchResult {
  const created = createBattle({ decks: setup.decks, seed: setup.seed, ...(setup.first === undefined ? {} : { first: setup.first }) });
  if (!created.ok) {
    throw new Error(created.error);
  }
  const players = [createAi(setup.levels[0], `${setup.seed}:0`), createAi(setup.levels[1], `${setup.seed}:1`)] as const;
  let state = created.state;
  let actions = 0;
  watch?.(created.events, state);
  while (state.phase !== 'over') {
    const actor = playerToAct(state);
    if (actor === null || actions >= MAX_ACTIONS) {
      throw new Error(`The battle did not finish (${actions} actions, turn ${state.turn}).`);
    }
    const action = players[actor].choose(observe(state, actor), actor);
    const result = step(state, action);
    if (!result.ok) {
      throw new Error(`${result.error} ${JSON.stringify(action)} (turn ${state.turn}, player ${actor})`);
    }
    state = result.state;
    actions += 1;
    watch?.(result.events, state);
  }
  return {
    winner: state.winner ?? 'draw',
    reason: state.endReason ?? 'memories',
    turns: state.turn,
    actions,
    memories: [state.players[0].memories, state.players[1].memories],
    first: state.first,
    mulligans: state.mulligans,
    state,
  };
}

export interface Tally {
  readonly games: number;
  readonly wins: readonly [number, number];
  readonly draws: number;
  /** Wins of the player who went first. */
  readonly firstPlayerWins: number;
  readonly averageTurns: number;
  readonly averageActions: number;
  readonly reasons: Readonly<Record<string, number>>;
}

/** Plays `games` battles with different seeds and adds up the results. Players swap who goes first every other game. */
export function playMany(setup: Omit<MatchSetup, 'seed' | 'first'>, games: number, seed: string): Tally {
  const wins: [number, number] = [0, 0];
  const reasons: Record<string, number> = {};
  let draws = 0;
  let firstPlayerWins = 0;
  let turns = 0;
  let actions = 0;
  for (let game = 0; game < games; game += 1) {
    const result = playMatch({ ...setup, seed: `${seed}:${game}` });
    turns += result.turns;
    actions += result.actions;
    reasons[result.reason] = (reasons[result.reason] ?? 0) + 1;
    if (result.winner === 'draw') {
      draws += 1;
    } else {
      wins[result.winner] += 1;
      if (result.winner === result.first) {
        firstPlayerWins += 1;
      }
    }
  }
  return { games, wins, draws, firstPlayerWins, averageTurns: turns / games, averageActions: actions / games, reasons };
}
