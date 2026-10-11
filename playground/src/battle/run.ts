// One step of a battle works on a private copy of the state and writes into it. `Run` holds that copy, the events the
// step reports and the random numbers it uses. The state types in types.ts are read-only; the mutable twins below are
// only used inside the engine, and `endRun` hands the result back as the read-only state.

import { restoreRng, type Rng, type RngState } from '../domain/random';
import type { BattleEvent, BattlePhase, BattleState, EndReason, PendingChoice, PlayerIndex } from './types';

export interface MutableFigure {
  uid: number;
  stack: string[];
  hearts: number;
  damage: number;
  arrivedTurn: number;
  evolvedTurn: number;
  abilityTurn: number;
  stunTurn: number;
}

export interface MutablePlayer {
  deck: string[];
  hand: string[];
  discard: string[];
  active: MutableFigure | null;
  bench: MutableFigure[];
  memories: number;
  turnsTaken: number;
  heartGiven: boolean;
  supporterPlayed: boolean;
  retreated: boolean;
  shieldTurn: number;
  setupDone: boolean;
}

export interface MutableState {
  phase: BattlePhase;
  turn: number;
  current: PlayerIndex;
  first: PlayerIndex;
  players: [MutablePlayer, MutablePlayer];
  pending: PendingChoice | null;
  attacking: PlayerIndex | null;
  winner: PlayerIndex | 'draw' | null;
  endReason: EndReason | null;
  rng: RngState;
  nextUid: number;
  mulligans: [number, number];
}

export interface Run {
  readonly state: MutableState;
  readonly events: BattleEvent[];
  readonly rng: Rng;
}

/** A private copy of `state` to write into. */
export function startRun(state: BattleState): Run {
  const copy = structuredClone(state) as MutableState;
  return { state: copy, events: [], rng: restoreRng(copy.rng) };
}

/** The finished copy as the read-only state, with the random generator where the step left it. */
export function endRun(run: Run): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  run.state.rng = run.rng.state();
  const state: BattleState = run.state;
  return { state, events: run.events };
}

export function emit(run: Run, event: BattleEvent): void {
  run.events.push(event);
}

export function playerOf(run: Run, index: PlayerIndex): MutablePlayer {
  return run.state.players[index];
}
