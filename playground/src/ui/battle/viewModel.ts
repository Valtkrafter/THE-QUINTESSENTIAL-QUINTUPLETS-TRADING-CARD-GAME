// What the battle screen needs to know about a battle, worked out from the engine's state and the list of allowed actions.
// Pure functions, so the board only has to draw them and every rule here has a test.

import { baseDamage, damageAgainst, freeHearts, moveHeartCost, studyDiscount, topCard } from '../../battle/rules';
import type { BattleAction, BattleState, ChoicePrompt, FigureRef, PlayerIndex } from '../../battle/types';
import type { Affinity } from '../../cards/model';
import { text } from '../text';

type Of<T extends BattleAction['type']> = Extract<BattleAction, { type: T }>;

function sameRef(a: FigureRef, b: FigureRef): boolean {
  return a.zone === 'active' ? b.zone === 'active' : b.zone === 'bench' && a.index === b.index;
}

// --- Hand -----------------------------------------------------------------------------------------------------------

export interface HandOptions {
  /** Put the card in front or on the Bench (in the setup and in the main phase). */
  readonly place: Of<'setup-place'> | Of<'play-basic'> | null;
  /** Every Character this card can evolve. */
  readonly evolve: readonly Of<'evolve'>[];
  readonly supporter: Of<'play-supporter'> | null;
}

/** What can be done with the card at `handIndex`. */
export function handOptions(legal: readonly BattleAction[], handIndex: number): HandOptions {
  let place: HandOptions['place'] = null;
  let supporter: HandOptions['supporter'] = null;
  const evolve: Of<'evolve'>[] = [];
  for (const action of legal) {
    if ((action.type === 'setup-place' || action.type === 'play-basic') && action.handIndex === handIndex) {
      place ??= action;
    } else if (action.type === 'play-supporter' && action.handIndex === handIndex) {
      supporter = action;
    } else if (action.type === 'evolve' && action.handIndex === handIndex) {
      evolve.push(action);
    }
  }
  return { place, evolve, supporter };
}

/** True when the card in the hand can be played in some way right now. */
export function isPlayable(options: HandOptions): boolean {
  return options.place !== null || options.evolve.length > 0 || options.supporter !== null;
}

// --- Characters in play -----------------------------------------------------------------------------------------

export interface FigureOptions {
  readonly giveHeart: Of<'give-heart'> | null;
  readonly ability: Of<'use-ability'> | null;
  /** Swap this Benched Character with the Active one. */
  readonly retreat: Of<'retreat'> | null;
}

export function figureOptions(legal: readonly BattleAction[], ref: FigureRef): FigureOptions {
  let giveHeart: FigureOptions['giveHeart'] = null;
  let ability: FigureOptions['ability'] = null;
  let retreat: FigureOptions['retreat'] = null;
  for (const action of legal) {
    if (action.type === 'give-heart' && sameRef(action.target, ref)) {
      giveHeart = action;
    } else if (action.type === 'use-ability' && sameRef(action.figure, ref)) {
      ability = action;
    } else if (action.type === 'retreat' && ref.zone === 'bench' && action.benchIndex === ref.index) {
      retreat = action;
    }
  }
  return { giveHeart, ability, retreat };
}

// --- Moves of the Active Character --------------------------------------------------------------------------------

/** One Heart of a cost: paid by a Heart the Character holds, still open, or free (a Bench ability pays for it). */
export type DotState = 'paid' | 'open' | 'free';

export interface CostDot {
  /** What is printed: the kind of the Character, or `study` for the grey Heart that any Heart pays. */
  readonly kind: Affinity;
  readonly state: DotState;
}

/**
 * The Hearts of a cost, each marked: paid, open or free. A Heart always has the kind of its Character, so only the number counts:
 * the Hearts the Character holds pay the dots one after the other, a grey one as well as the others. The grey Hearts that a Bench
 * ability pays for (`discount`) are free; they are the last grey ones of the cost, as `moveHeartCost` counts them.
 */
export function costDots(cost: readonly Affinity[], hearts: number, discount: number): CostDot[] {
  let freed = Math.min(discount, cost.filter((kind) => kind === 'study').length);
  const free = cost.map(() => false);
  for (let index = cost.length - 1; index >= 0 && freed > 0; index -= 1) {
    if (cost[index] === 'study') {
      free[index] = true;
      freed -= 1;
    }
  }
  let held = hearts;
  return cost.map((kind, index): CostDot => {
    if (free[index] === true) {
      return { kind, state: 'free' };
    }
    if (held > 0) {
      held -= 1;
      return { kind, state: 'paid' };
    }
    return { kind, state: 'open' };
  });
}

export interface MoveView {
  readonly index: number;
  readonly name: string;
  readonly cost: readonly Affinity[];
  /** The Hearts of the cost, marked with what the Character holds. */
  readonly dots: readonly CostDot[];
  /** The kind of the Hearts the Character holds: it is what pays the grey Hearts. */
  readonly paidWith: Affinity;
  /** How many Hearts the move needs (grey ones that a Bench ability pays for left out). */
  readonly heartsNeeded: number;
  /** The damage as printed: "20", "70+", "30×", or "" for a move without damage. */
  readonly printed: string;
  readonly text: string;
  readonly usable: boolean;
  /** What the move would really do to the enemy Active Character right now (null without a target or without damage). */
  readonly estimate: number | null;
  readonly doubled: boolean;
  readonly resisted: boolean;
}

/** The moves of `player`'s Active Character with what they would do to the other side's Active Character. */
export function moveViews(battle: BattleState, player: PlayerIndex, legal: readonly BattleAction[]): MoveView[] {
  const owner = battle.players[player];
  const foe = battle.players[player === 0 ? 1 : 0];
  const active = owner.active;
  if (active === null) {
    return [];
  }
  const card = topCard(active);
  const discount = studyDiscount(owner);
  return card.moves.map((move, index): MoveView => {
    const usable = legal.some((action) => action.type === 'attack' && action.moveIndex === index);
    const base = baseDamage(move, active, owner);
    const result = foe.active === null || (move.damage === null && base === 0) ? null : damageAgainst(base, card, foe.active, foe.shieldTurn === battle.turn);
    return {
      index,
      name: move.name,
      cost: move.cost,
      dots: costDots(move.cost, active.hearts, discount),
      paidWith: card.affinity,
      heartsNeeded: moveHeartCost(move, discount),
      printed: move.damage === null ? '' : `${move.damage}${move.damageSuffix ?? ''}`,
      text: move.text ?? '',
      usable,
      estimate: result === null ? null : result.damage,
      doubled: result?.doubled ?? false,
      resisted: result?.resisted ?? false,
    };
  });
}

// --- Free Hearts and the state of the turn -------------------------------------------------------------------------

/** How many free Hearts `player` may still give this turn. */
export function heartsLeft(battle: BattleState, player: PlayerIndex): number {
  return Math.max(0, freeHearts(battle, player) - battle.players[player].heartsGiven);
}

export type Mood = 'setup' | 'your-turn' | 'their-turn' | 'over';

/** Whose move it is. While a question is open it is the move of whoever has to answer it, even when the other player's turn goes on. */
export function moodOf(battle: BattleState): Mood {
  if (battle.phase === 'over') {
    return 'over';
  }
  if (battle.phase === 'setup') {
    return 'setup';
  }
  const mover = battle.pending === null ? battle.current : battle.pending.player;
  return mover === 0 ? 'your-turn' : 'their-turn';
}

// --- Questions ---------------------------------------------------------------------------------------------------------

export interface PromptView {
  readonly title: string;
  readonly prompt: ChoicePrompt;
  readonly optional: boolean;
}

/** The question the player has to answer, or null when none is waiting for them. */
export function promptFor(battle: BattleState, player: PlayerIndex): PromptView | null {
  const pending = battle.pending;
  if (pending === null || pending.player !== player) {
    return null;
  }
  const prompt = pending.prompt;
  const titles = text.battle.prompts;
  switch (prompt.kind) {
    case 'figure':
      return { title: titles[prompt.reason], prompt, optional: prompt.optional };
    case 'card':
      return { title: titles[prompt.reason], prompt, optional: prompt.optional };
    case 'yes-no':
      return { title: titles[prompt.reason], prompt, optional: false };
  }
}
