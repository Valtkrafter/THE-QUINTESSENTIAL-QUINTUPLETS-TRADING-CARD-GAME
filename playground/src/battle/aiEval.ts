// How the computer opponents look at a battle: small, readable estimates of what a move, a card or a Character is worth.
// The numbers are "points": roughly one point is a tenth of a hit point, a knock-out is worth a lot and a win is worth
// everything. They only have to put actions in a sensible order, not to be exact.

import { cardById } from '../cards/catalog';
import type { CharacterCard, Effect, SupporterCard } from '../cards/model';
import {
  BENCH_SIZE,
  MEMORIES_TO_WIN,
  baseDamage,
  currentHp,
  damageAgainst,
  figuresOf,
  freeHearts,
  memoriesFor,
  moveHeartCost,
  other,
  studyDiscount,
  survivalHp,
  topCard,
} from './rules';
import type { BattleState, Figure, PlayerIndex, PlayerState } from './types';

/** The two sides of a battle as one player sees them. */
export interface Sides {
  readonly state: BattleState;
  readonly me: PlayerIndex;
  readonly mine: PlayerState;
  readonly theirs: PlayerState;
  /** Whether the player looks ahead at what the enemy could do next turn (the harder opponents do). */
  readonly aware: boolean;
}

export function sidesOf(state: BattleState, me: PlayerIndex, aware = true): Sides {
  return { state, me, mine: state.players[me], theirs: state.players[other(me)], aware };
}

/** Points for a battle that is won on the spot. */
export const WIN = 5000;
const KNOCK_OUT = 55;

// --- Moves ---------------------------------------------------------------------------------------------------------------

export interface MoveEstimate {
  readonly moveIndex: number;
  readonly damage: number;
  readonly value: number;
}

/** Points for the effects of a move, besides its damage. */
function effectPoints(effects: readonly Effect[], attacker: Figure, defender: Figure | null): number {
  let points = 0;
  for (const effect of effects) {
    switch (effect.type) {
      case 'heal':
        points += Math.min(effect.amount, attacker.damage) * 0.5;
        break;
      case 'draw':
        points += 7 * effect.count;
        break;
      case 'discardHearts':
        points += 9 * Math.min(effect.count, defender?.hearts ?? 0);
        break;
      case 'preventAttackNextTurn':
        points += 16;
        break;
      case 'attachHeart':
        points += 9 * effect.count;
        break;
      case 'coinFlip':
        points += 0.5 * effectPoints(effect.heads, attacker, defender) + 0.5 * effectPoints(effect.tails, attacker, defender);
        break;
      default:
        break;
    }
  }
  return points;
}

/** Points for one move of `attacker` against the enemy Active Character: damage, progress, knock-outs and side effects. */
export function estimateMove(sides: Sides, attacker: Figure, moveIndex: number, shielded: boolean): MoveEstimate {
  const card = topCard(attacker);
  const move = card.moves[moveIndex];
  const defender = sides.theirs.active;
  if (move === undefined || defender === null) {
    return { moveIndex, damage: 0, value: 0 };
  }
  const result = damageAgainst(baseDamage(move, attacker, sides.mine), card, defender, shielded);
  const hp = currentHp(defender);
  let value = result.damage * 0.9 + effectPoints(move.effects, attacker, defender);
  if (result.damage >= hp) {
    const lucky = survivalHp(defender) !== null ? 0.5 : 1;
    const memories = memoriesFor(defender);
    const wins = sides.mine.memories + memories >= MEMORIES_TO_WIN || sides.theirs.bench.length === 0;
    value += (wins ? WIN : KNOCK_OUT * memories) * lucky;
  } else {
    value += (result.damage / hp) * 12;
  }
  return { moveIndex, damage: result.damage, value };
}

/** The best move `attacker` could make with `hearts` Hearts, or null if it has none it could pay for. */
export function bestMove(sides: Sides, attacker: Figure, hearts: number, discount: number, shielded: boolean): MoveEstimate | null {
  let best: MoveEstimate | null = null;
  topCard(attacker).moves.forEach((move, moveIndex) => {
    if (moveHeartCost(move, discount) > hearts) {
      return;
    }
    const estimate = estimateMove(sides, attacker, moveIndex, shielded);
    if (best === null || estimate.value > best.value) {
      best = estimate;
    }
  });
  return best;
}

/** The most damage `attacker` could do to `defender` this turn with the Hearts it has, plus the free Heart if that is still unused. */
export function reachAgainst(sides: Sides, attacker: Figure, defender: Figure): number {
  const card = topCard(attacker);
  const hearts = attacker.hearts + Math.max(0, freeHearts(sides.state, sides.me) - sides.mine.heartsGiven);
  const discount = studyDiscount(sides.mine);
  let most = 0;
  for (const move of card.moves) {
    if (moveHeartCost(move, discount) <= hearts) {
      most = Math.max(most, damageAgainst(baseDamage(move, attacker, sides.mine), card, defender, false).damage);
    }
  }
  return most;
}

/** The most damage the enemy Active Character could deal to mine during its next turn (it may get one more Heart). */
export function threatToActive(sides: Sides): number {
  const attacker = sides.theirs.active;
  const defender = sides.mine.active;
  if (attacker === null || defender === null) {
    return 0;
  }
  const card = topCard(attacker);
  const discount = studyDiscount(sides.theirs);
  let most = 0;
  for (const move of card.moves) {
    if (moveHeartCost(move, discount) > attacker.hearts + 1) {
      continue;
    }
    const shielded = sides.mine.shieldTurn === sides.state.turn + 1;
    most = Math.max(most, damageAgainst(baseDamage(move, attacker, sides.theirs), card, defender, shielded).damage);
  }
  return most;
}

/** True when the enemy could knock out my Active Character next turn (and the player pays attention to that). */
export function inDanger(sides: Sides): boolean {
  const active = sides.mine.active;
  return sides.aware && active !== null && threatToActive(sides) >= currentHp(active);
}

// --- Characters ---------------------------------------------------------------------------------------------------------

/** The most damage a Character's cards can ever deal in one move, for judging a card without a target. */
export function bestPrintedDamage(card: CharacterCard): number {
  let most = 0;
  for (const move of card.moves) {
    const bonus = move.effects.some((effect) => effect.type === 'damagePerHeart') ? 60 : move.effects.some((effect) => effect.type === 'damagePerCount') ? 40 : 0;
    most = Math.max(most, (move.damage ?? 0) + bonus);
  }
  return most;
}

/** How good a Character is to have in front, judged from its card alone. */
export function frontValue(card: CharacterCard): number {
  const cheapest = card.moves.reduce((least, move) => Math.min(least, move.cost.length), 9);
  return card.hp * 0.1 + bestPrintedDamage(card) * 0.18 - (Number.isFinite(cheapest) ? cheapest : 3) * 1.5;
}

/** How good it is to have this Character in play right now: health, Hearts, how far it has evolved and what it can do. */
export function figureWorth(figure: Figure): number {
  const card = topCard(figure);
  return currentHp(figure) * 0.1 + figure.hearts * 4 + figure.stack.length * 5 + bestPrintedDamage(card) * 0.1;
}

/** True when the Character already has the Hearts for every move it has. */
function fullyPowered(figure: Figure, discount: number): boolean {
  return topCard(figure).moves.every((move) => moveHeartCost(move, discount) <= figure.hearts);
}

/**
 * How much one more Heart is worth on this Character. A Heart that opens a move is worth a lot, more so on the Active one;
 * Hearts on the Bench only matter once the Active Character has what it needs.
 */
export function heartWorth(sides: Sides, figure: Figure, isActive: boolean): number {
  const card = topCard(figure);
  const discount = isActive ? studyDiscount(sides.mine) : 0;
  const shielded = sides.theirs.shieldTurn === sides.state.turn;
  let points = 0;
  let nearest = Number.POSITIVE_INFINITY;
  card.moves.forEach((move, moveIndex) => {
    const cost = moveHeartCost(move, discount);
    if (cost <= figure.hearts) {
      return;
    }
    nearest = Math.min(nearest, cost - figure.hearts);
    if (cost === figure.hearts + 1) {
      const worth = isActive ? estimateMove(sides, figure, moveIndex, shielded).value : bestPrintedDamage(card) * 0.2;
      points += 22 + worth * 0.5;
    }
  });
  // A move that hits harder for every Heart on its Character makes each Heart worth more.
  const scales = card.moves.some((move) => move.effects.some((effect) => effect.type === 'damagePerHeart'));
  if (scales && isActive && !Number.isFinite(nearest)) {
    points += 24;
  }
  if (Number.isFinite(nearest)) {
    points += 10 / nearest + (isActive ? 2 : 0);
  }
  if (isActive) {
    return points;
  }
  const active = sides.mine.active;
  const activeReady = active === null || fullyPowered(active, studyDiscount(sides.mine));
  return points * (activeReady ? 0.8 : 0.3);
}

/** How well a Character stands against the enemy's Active one: weakness hurts, resistance helps. Only careful players look at this. */
export function matchupBonus(sides: Sides, figure: Figure): number {
  const foe = sides.theirs.active;
  if (!sides.aware || foe === null) {
    return 0;
  }
  const kind = topCard(foe).affinity;
  const card = topCard(figure);
  return (card.weakness === kind ? -18 : 0) + (card.resistance === kind ? 12 : 0);
}

// --- Cards ----------------------------------------------------------------------------------------------------------------

/** Whether a figure in play could still be built upon by this card (now or in a later turn). */
export function canGrowWith(card: CharacterCard, owner: PlayerState): boolean {
  const wanted = card.stage === 'close' ? 'basic' : card.stage === 'bride' ? 'close' : null;
  return wanted !== null && figuresOf(owner).some((figure) => topCard(figure).character === card.character && topCard(figure).stage === wanted);
}

/** 1 while drawing `count` cards leaves a comfortable deck, falling to a penalty as the deck runs low (an empty deck loses). */
function deckRoom(owner: PlayerState, count: number): number {
  const left = owner.deck.length - count;
  if (left >= 8) {
    return 1;
  }
  return left >= 4 ? 0.4 : -1;
}

/** How many Characters of the owner could be healed, and by how much at most. */
function damageToHeal(owner: PlayerState, amount: number): number {
  return figuresOf(owner).reduce((total, figure) => total + Math.min(amount, figure.damage), 0);
}

/** Points for playing a Supporter now. */
export function supporterWorth(sides: Sides, card: SupporterCard, handAfter: number): number {
  return effectsWorth(sides, card.effects, handAfter);
}

/** Points for what a list of effects would do for this player right now (a Supporter, an ability, a Character played from the hand). */
export function effectsWorth(sides: Sides, effects: readonly Effect[], handAfter: number): number {
  const { mine, theirs } = sides;
  const free = BENCH_SIZE - mine.bench.length;
  const score = (effect: Effect): number => {
    switch (effect.type) {
      case 'draw':
        return (7 * effect.count + (handAfter <= 2 ? 8 : 0)) * deckRoom(mine, effect.count);
      case 'drawUntilHandSize':
        return 7 * Math.max(0, effect.size - handAfter) * deckRoom(mine, Math.max(0, effect.size - handAfter));
      case 'heal': {
        const biggest = Math.max(0, ...figuresOf(mine).map((figure) => Math.min(effect.amount, figure.damage)));
        const urgency = inDanger(sides) ? 1.4 : 1;
        if (effect.target === 'allOwn') {
          return damageToHeal(mine, effect.amount) * 0.55;
        }
        if (effect.target === 'allBenched') {
          return mine.bench.reduce((total, figure) => total + Math.min(effect.amount, figure.damage), 0) * 0.5;
        }
        return biggest * 0.6 * urgency;
      }
      case 'attachHeart': {
        const active = mine.active;
        const opens = active !== null ? heartWorth(sides, active, true) : 0;
        return Math.max(opens, 8) * (effect.count >= 2 ? 1.5 : 1);
      }
      case 'searchBasicToBench':
        return free > 0 ? 24 * Math.min(effect.count, free) : 0;
      case 'searchSupporter':
        return 12;
      case 'lookTopTakeOne':
        return 16;
      case 'shuffleHandDraw':
        return 7 * (effect.count - handAfter) - 6 * mine.hand.length * 0.4;
      case 'bothShuffleHandDraw':
        return 7 * (effect.count - handAfter) - 7 * (effect.count - theirs.hand.length);
      case 'opponentShuffleHandDraw':
        return Math.max(0, theirs.hand.length - effect.count) * 5 - 2;
      case 'forceOpponentSwitch': {
        const attacker = mine.active;
        const target = attacker === null ? undefined : theirs.bench.find((figure) => currentHp(figure) <= reachAgainst(sides, attacker, figure));
        return target === undefined ? 4 : 60;
      }
      case 'shieldActiveNextTurn':
        return inDanger(sides) ? 50 : (mine.active?.damage ?? 0) > 0 ? 12 : 3;
      case 'coinFlip':
        return 0.5 * effectsScore(effect.heads) + 0.5 * effectsScore(effect.tails);
      default:
        return 0;
    }
  };
  const effectsScore = (list: readonly Effect[]): number => list.reduce((total, effect) => total + score(effect), 0);
  return effectsScore(effects);
}

/** How much the AI wants a card in its hand: used to pick from searches and to decide what to keep on top of the deck. */
export function cardWanted(sides: Sides, cardId: string): number {
  const card = cardById(cardId);
  if (card === undefined) {
    return 0;
  }
  if (card.kind === 'supporter') {
    return Math.min(26, Math.max(5, supporterWorth(sides, card, sides.mine.hand.length)));
  }
  if (card.stage === 'basic') {
    return sides.mine.bench.length < BENCH_SIZE ? 14 + frontValue(card) * 0.2 : 5;
  }
  if (card.stage === 'event') {
    return 12 + frontValue(card) * 0.2;
  }
  return canGrowWith(card, sides.mine) ? 30 : 6;
}
