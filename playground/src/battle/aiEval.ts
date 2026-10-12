// How the computer opponents look at a battle: small, readable estimates of what a move, a card or a Character is worth.
// The numbers are "points": roughly one point is a tenth of a hit point, a knock-out is worth a lot and a win is worth
// everything. They only have to put actions in a sensible order, not to be exact.

import { cardById } from '../cards/catalog';
import type { CharacterCard, Effect, SupporterCard } from '../cards/model';
import { attackingAllowed } from './legal';
import {
  BENCH_SIZE,
  MEMORIES_TO_WIN,
  baseDamage,
  characterOf,
  currentHp,
  damageAgainst,
  figuresOf,
  freeHearts,
  freeHeartsNext,
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

/** The same Character holding `hearts` Hearts: what its moves would do, and be worth, if it had them. */
function holding(figure: Figure, hearts: number): Figure {
  return figure.hearts === hearts ? figure : { ...figure, hearts };
}

/** The best move `attacker` could make with `hearts` Hearts, or null if it has none it could pay for. */
export function bestMove(sides: Sides, attacker: Figure, hearts: number, discount: number, shielded: boolean): MoveEstimate | null {
  const held = holding(attacker, hearts);
  let best: MoveEstimate | null = null;
  topCard(attacker).moves.forEach((move, moveIndex) => {
    if (moveHeartCost(move, discount) > hearts) {
      return;
    }
    const estimate = estimateMove(sides, held, moveIndex, shielded);
    if (best === null || estimate.value > best.value) {
      best = estimate;
    }
  });
  return best;
}

/** The free Hearts this player may still give in this turn. */
export function freeLeft(sides: Sides): number {
  return Math.max(0, freeHearts(sides.state, sides.me) - sides.mine.heartsGiven);
}

/** Whether `figure` may still evolve in this turn (not in the player's first turn, not in the turn it arrived, once a turn). */
function mayEvolveNow(sides: Sides, figure: Figure): boolean {
  return sides.mine.turnsTaken > 1 && figure.arrivedTurn < sides.state.turn && figure.evolvedTurn !== sides.state.turn;
}

/** Whether the Active Character of this player may attack in this turn at all (not in the very first turn, not when stunned). */
function mayAttackNow(sides: Sides, active: Figure): boolean {
  return attackingAllowed(sides.state, sides.me) && active.stunTurn !== sides.state.turn;
}

/** A turn later counts for a little less than this turn: much can happen before it. */
const LATER = 0.85;

/** The cards of the hand that can be put on `figure` once it is allowed to evolve (one card of each kind, not counting `used`). */
function evolutionCards(sides: Sides, figure: Figure, used: string | null): string[] {
  const below = topCard(figure);
  const wanted = below.stage === 'basic' ? 'close' : below.stage === 'close' ? 'bride' : null;
  const cards = new Set<string>();
  let skipped = used === null;
  for (const cardId of sides.mine.hand) {
    if (!skipped && cardId === used) {
      skipped = true;
      continue;
    }
    const card = characterOf(cardId);
    if (wanted !== null && card?.stage === wanted && card.character === below.character) {
      cards.add(cardId);
    }
  }
  return [...cards];
}

/** The Character as it could be in the next turn: as it is, or evolved with a card of the hand. */
function formsNextTurn(sides: Sides, figure: Figure, used: string | null): Figure[] {
  return [figure, ...evolutionCards(sides, figure, used).map((cardId) => ({ ...figure, stack: [...figure.stack, cardId] }))];
}

/** Points of the best move `attacker` could make in the next turn if it holds `hearts` Hearts after this one (the free Hearts come on top). */
function valueNextTurn(sides: Sides, attacker: Figure, hearts: number, discount: number, used: string | null): number {
  const stock = hearts + freeHeartsNext(sides.state, sides.me);
  return Math.max(0, ...formsNextTurn(sides, attacker, used).map((form) => bestMove(sides, form, stock, discount, false)?.value ?? 0));
}

export interface AttackPlan {
  /** The move to make now, or null to wait. */
  readonly moveIndex: number | null;
  /** Points of this turn and the next one together. */
  readonly value: number;
}

/** The plan of one form of the Character; `used` is the card of the hand that made it evolve, if it did. */
function planOf(sides: Sides, form: Figure, used: string | null, hearts: number, discount: number, shielded: boolean, mayAttack: boolean): AttackPlan {
  const held = holding(form, hearts);
  // A Character that may fall before it gets another turn is not worth saving Hearts for.
  const later = inDanger(sides) ? LATER * 0.4 : LATER;
  let best: AttackPlan = { moveIndex: null, value: later * valueNextTurn(sides, form, hearts, discount, used) };
  if (!mayAttack) {
    return best;
  }
  topCard(form).moves.forEach((move, moveIndex) => {
    const cost = moveHeartCost(move, discount);
    if (cost > hearts) {
      return;
    }
    const value = estimateMove(sides, held, moveIndex, shielded).value + later * valueNextTurn(sides, form, hearts - cost, discount, used);
    if (value >= best.value) {
      best = { moveIndex, value };
    }
  });
  return best;
}

/**
 * What the Active Character should do in this turn, judged over this turn and the next. A move uses up its Hearts, so a small
 * attack now can cost the big one in the next turn, and waiting one turn can be worth more than a poke. Equal plans attack.
 * A card of the hand that can evolve the Character right now counts too: the evolution is played before the attack.
 */
export function planAttack(sides: Sides, attacker: Figure, hearts: number, discount: number, shielded: boolean, mayAttack: boolean): AttackPlan {
  let best = planOf(sides, attacker, null, hearts, discount, shielded, mayAttack);
  if (!mayEvolveNow(sides, attacker)) {
    return best;
  }
  for (const cardId of evolutionCards(sides, attacker, null)) {
    const plan = planOf(sides, { ...attacker, stack: [...attacker.stack, cardId] }, cardId, hearts, discount, shielded, mayAttack);
    if (plan.value > best.value) {
      best = plan;
    }
  }
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

/** The most damage the enemy Active Character could deal to mine during its next turn (it gets its free Hearts first). */
export function threatToActive(sides: Sides): number {
  const attacker = sides.theirs.active;
  const defender = sides.mine.active;
  if (attacker === null || defender === null) {
    return 0;
  }
  const card = topCard(attacker);
  const discount = studyDiscount(sides.theirs);
  const hearts = attacker.hearts + freeHeartsNext(sides.state, other(sides.me));
  let most = 0;
  for (const move of card.moves) {
    if (moveHeartCost(move, discount) > hearts) {
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

/**
 * What the next Hearts add to the plan of the Active Character, per Heart. A move may need several Hearts before it opens, so
 * the best number of Hearts to give (up to the free Hearts left) counts, not just the first one.
 */
function activeHeartGain(sides: Sides, active: Figure): number {
  const discount = studyDiscount(sides.mine);
  const shielded = sides.theirs.shieldTurn === sides.state.turn;
  const may = mayAttackNow(sides, active);
  const base = planAttack(sides, active, active.hearts, discount, shielded, may).value;
  let best = 0;
  for (let given = 1; given <= Math.max(1, freeLeft(sides)); given += 1) {
    best = Math.max(best, (planAttack(sides, active, active.hearts + given, discount, shielded, may).value - base) / given);
  }
  return best;
}

/**
 * How much one more Heart is worth on this Character. A Heart that opens a move (now or next turn) is worth a lot, more so on the
 * Active one; Hearts on the Bench only matter while the Active Character has what it needs. A free Heart that is not given is lost,
 * so a Heart is always worth a little: it waits on the Character for the next move.
 */
export function heartWorth(sides: Sides, figure: Figure, isActive: boolean): number {
  const card = topCard(figure);
  const stock = figure.hearts + freeHeartsNext(sides.state, sides.me);
  if (isActive) {
    const gain = activeHeartGain(sides, figure);
    let points = gain > 0 ? 22 + gain * 0.5 : 3;
    // Far from any move: the nearer the Character gets, the better.
    const discount = studyDiscount(sides.mine);
    const missing = Math.min(...card.moves.map((move) => moveHeartCost(move, discount) - stock).filter((lack) => lack > 0), Number.POSITIVE_INFINITY);
    if (Number.isFinite(missing)) {
      points += 10 / missing + 2;
    }
    return points;
  }
  let points = 2.5;
  let nearest = Number.POSITIVE_INFINITY;
  for (const move of card.moves) {
    const cost = moveHeartCost(move, 0);
    if (cost <= figure.hearts) {
      continue;
    }
    nearest = Math.min(nearest, cost - figure.hearts);
    if (cost === figure.hearts + 1) {
      points += 22 + bestPrintedDamage(card) * 0.1;
    }
  }
  if (Number.isFinite(nearest)) {
    points += 10 / nearest;
  }
  const active = sides.mine.active;
  const activeWantsThem = active !== null && activeHeartGain(sides, active) > 0;
  return points * (activeWantsThem ? 0.3 : 0.8);
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
