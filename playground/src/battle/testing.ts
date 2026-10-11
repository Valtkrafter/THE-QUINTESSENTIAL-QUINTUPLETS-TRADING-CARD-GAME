// Helpers for the battle tests (and for development checks): build a battle state by hand, finish a setup, play random
// battles. Not used by the game itself.

import { CATALOG } from '../cards/catalog';
import { createRng, type Rng } from '../domain/random';
import { createBattle, step, type BattleSetup } from './engine';
import { legalActions } from './legal';
import { observe } from './observe';
import { BENCH_SIZE, other } from './rules';
import type { BattleAction, BattleEvent, BattleState, Figure, PlayerIndex, PlayerState } from './types';

export interface FigureSpec {
  /** Card ids from the Basic up to the card on top. */
  readonly stack: readonly string[];
  readonly hearts?: number;
  readonly damage?: number;
  readonly arrivedTurn?: number;
  readonly evolvedTurn?: number;
  readonly abilityTurn?: number;
  readonly stunTurn?: number;
}

export interface PlayerSpec {
  readonly deck?: readonly string[];
  readonly hand?: readonly string[];
  readonly discard?: readonly string[];
  readonly active?: FigureSpec | null;
  readonly bench?: readonly FigureSpec[];
  readonly memories?: number;
  readonly turnsTaken?: number;
  readonly heartsGiven?: number;
  readonly supporterPlayed?: boolean;
  readonly retreated?: boolean;
  readonly shieldTurn?: number;
}

export interface StateSpec {
  readonly turn?: number;
  readonly current?: PlayerIndex;
  readonly first?: PlayerIndex;
  readonly seed?: string;
  readonly players: readonly [PlayerSpec, PlayerSpec];
}

/** Cards that can be drawn when a test does not care about the deck. */
export const FILLER: readonly string[] = Array.from({ length: 20 }, () => 'TQQ01-001');

let uid = 1000;

function figureFrom(spec: FigureSpec): Figure {
  uid += 1;
  return {
    uid,
    stack: spec.stack,
    hearts: spec.hearts ?? 0,
    damage: spec.damage ?? 0,
    arrivedTurn: spec.arrivedTurn ?? 0,
    evolvedTurn: spec.evolvedTurn ?? 0,
    abilityTurn: spec.abilityTurn ?? 0,
    stunTurn: spec.stunTurn ?? 0,
  };
}

function playerFrom(spec: PlayerSpec): PlayerState {
  return {
    deck: spec.deck ?? FILLER,
    hand: spec.hand ?? [],
    discard: spec.discard ?? [],
    active: spec.active === undefined || spec.active === null ? null : figureFrom(spec.active),
    bench: (spec.bench ?? []).map(figureFrom),
    memories: spec.memories ?? 0,
    turnsTaken: spec.turnsTaken ?? 3,
    heartsGiven: spec.heartsGiven ?? 0,
    supporterPlayed: spec.supporterPlayed ?? false,
    retreated: spec.retreated ?? false,
    shieldTurn: spec.shieldTurn ?? 0,
    setupDone: true,
  };
}

/** A battle in the middle of the main phase, built by hand. Both players have taken three turns unless the spec says otherwise. */
export function mainState(spec: StateSpec): BattleState {
  return {
    phase: 'main',
    turn: spec.turn ?? 7,
    current: spec.current ?? 0,
    first: spec.first ?? 0,
    players: [playerFrom(spec.players[0]), playerFrom(spec.players[1])],
    pending: null,
    attacking: null,
    winner: null,
    endReason: null,
    rng: createRng(spec.seed ?? 'test').state(),
    nextUid: 5000,
    mulligans: [0, 0],
  };
}

/** A seed whose first coin flip lands on heads (or on tails), for tests of coin effects in a hand-built state. */
export function coinSeed(heads: boolean): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const seed = `coin-${attempt}`;
    if (createRng(seed).next() < 0.5 === heads) {
      return seed;
    }
  }
  throw new Error('no seed found');
}

export interface Played {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}

/** Runs actions one after the other; throws when one is refused, so a test shows where its story broke. */
export function play(state: BattleState, ...actions: readonly BattleAction[]): Played {
  let current = state;
  const events: BattleEvent[] = [];
  for (const action of actions) {
    const result = step(current, action);
    if (!result.ok) {
      throw new Error(`${result.error} (${JSON.stringify(action)})`);
    }
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

/** Everything that must always be true of a state, as a list of what is wrong (empty when all is well). */
export function invariantProblems(state: BattleState, cardsPerPlayer = 30): string[] {
  const problems: string[] = [];
  const uids = new Set<number>();
  state.players.forEach((player, index) => {
    const figures = player.active === null ? player.bench : [player.active, ...player.bench];
    const total = player.deck.length + player.hand.length + player.discard.length + figures.reduce((sum, figure) => sum + figure.stack.length, 0);
    if (total !== cardsPerPlayer) {
      problems.push(`player ${index} has ${total} cards, not ${cardsPerPlayer}`);
    }
    if (player.bench.length > BENCH_SIZE) {
      problems.push(`player ${index} has ${player.bench.length} Benched Characters`);
    }
    for (const figure of figures) {
      if (uids.has(figure.uid)) {
        problems.push(`Character ${figure.uid} exists twice`);
      }
      uids.add(figure.uid);
      if (figure.hearts < 0 || figure.damage < 0) {
        problems.push(`Character ${figure.uid} has ${figure.hearts} Hearts and ${figure.damage} damage`);
      }
    }
    if (state.phase === 'main' && player.active === null && state.pending === null) {
      problems.push(`player ${index} has no Active Character`);
    }
  });
  if (state.phase === 'over' && state.winner === null) {
    problems.push('the battle is over without a winner');
  }
  return problems;
}

// --- Random battles -------------------------------------------------------------------------------------------------------

/** A legal deck of 30 cards: two copies of each design of one sister's line, then other Basics and Supporters. No Prime cards. */
export function simpleDeck(character: string): string[] {
  const plain = CATALOG.filter((card) => card.kind === 'supporter' || !card.prime);
  const own = plain.filter((card) => card.kind === 'character' && card.character === character);
  const others = plain.filter((card) => card.kind === 'character' && card.character !== character && card.stage === 'basic');
  const supporters = plain.filter((card) => card.kind === 'supporter');
  const deck: string[] = [];
  for (const card of [...own, ...others, ...supporters]) {
    if (deck.length + 2 > 30) {
      break;
    }
    deck.push(card.id, card.id);
  }
  return deck;
}

/** The Supporters of the example decks: draw, heal, search, hearts and a little disruption. Two copies of the first ones. */
const SUPPORT_CORE = ['TQQ01-061', 'TQQ01-067', 'TQQ01-062', 'TQQ01-063', 'TQQ01-068', 'TQQ01-064', 'TQQ01-065', 'TQQ01-069', 'TQQ01-076', 'TQQ01-078', 'TQQ01-079', 'TQQ01-077', 'TQQ01-070'];

/**
 * A 30-card deck built around one sister's line: her Basics, Close and Bride cards (not all of them twice), a few Prime
 * cards, and a mix of Supporters. For tests and for the first draft of the starter decks.
 */
export function lineDeck(character: string, options: { readonly primes?: number; readonly supporters?: readonly string[] } = {}): string[] {
  const own = CATALOG.filter((card) => card.kind === 'character' && card.character === character);
  const plain = own.filter((card) => card.kind === 'character' && !card.prime);
  const basics = plain.filter((card) => card.kind === 'character' && card.stage === 'basic').map((card) => card.id);
  const closes = plain.filter((card) => card.kind === 'character' && card.stage === 'close').map((card) => card.id);
  const brides = plain.filter((card) => card.kind === 'character' && card.stage === 'bride').map((card) => card.id);
  const primes = own.filter((card) => card.kind === 'character' && card.prime && card.stage !== 'event').map((card) => card.id);
  const deck: string[] = [];
  // Basics: two copies of each of the first three, one of the fourth. Close and Bride: two copies each.
  basics.slice(0, 3).forEach((id) => deck.push(id, id));
  basics.slice(3, 4).forEach((id) => deck.push(id));
  [...closes, ...brides].forEach((id) => deck.push(id, id));
  primes.slice(0, options.primes ?? 3).forEach((id) => deck.push(id));
  for (const id of options.supporters ?? SUPPORT_CORE) {
    if (deck.length >= 30) {
      break;
    }
    deck.push(id);
    if (['TQQ01-061', 'TQQ01-067'].includes(id) && deck.length < 30) {
      deck.push(id);
    }
  }
  return deck.slice(0, 30);
}

/** Places a Basic as Active and as many others as fit on the Bench, then says "done". */
function finishSetup(state: BattleState, player: PlayerIndex): BattleState {
  let current = state;
  for (let placed = 0; placed <= BENCH_SIZE; placed += 1) {
    const place = legalActions(current, player).find((action) => action.type === 'setup-place');
    if (place === undefined) {
      break;
    }
    current = play(current, place).state;
  }
  return play(current, { type: 'setup-done', player }).state;
}

/** Starts a battle and finishes both setups, so the first turn has begun. */
export function startedBattle(setup: BattleSetup): BattleState {
  const created = createBattle(setup);
  if (!created.ok) {
    throw new Error(created.error);
  }
  const first = created.state.first;
  return finishSetup(finishSetup(created.state, first), other(first));
}

export interface Playout {
  readonly state: BattleState;
  readonly actions: number;
  readonly events: readonly BattleEvent[];
}

/** Plays a battle to its end with random legal actions, looking only at what the acting player may see. */
export function randomPlayout(setup: BattleSetup, chance: Rng, check?: (state: BattleState) => void, maxActions = 4000): Playout {
  let state = startedBattle(setup);
  const events: BattleEvent[] = [];
  let actions = 0;
  while (state.phase !== 'over' && actions < maxActions) {
    const actor = state.pending?.player ?? state.current;
    const options = legalActions(observe(state, actor), actor);
    // Choosing evenly between every action would almost never attack or end a turn, so ending is made rare.
    const useful = options.filter((option) => option.type !== 'end-turn' || chance.next() < 0.15);
    const result = step(state, chance.pick(useful.length > 0 ? useful : options));
    if (!result.ok) {
      throw new Error(result.error);
    }
    state = result.state;
    events.push(...result.events);
    actions += 1;
    check?.(state);
  }
  return { state, actions, events };
}
