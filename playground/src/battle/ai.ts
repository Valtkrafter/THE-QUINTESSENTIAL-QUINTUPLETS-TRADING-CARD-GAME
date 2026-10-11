// The computer opponents. An opponent looks at the battle through `observe` (no hidden cards), lists what it may do and
// picks the action that is worth the most points (aiEval.ts). Easy opponents blunder now and then and ignore danger,
// normal ones play every turn sensibly, hard ones also look ahead at what the enemy could do next turn.

import { cardById } from '../cards/catalog';
import { createRng, type Rng } from '../domain/random';
import {
  cardWanted,
  effectsWorth,
  bestMove,
  bestPrintedDamage,
  estimateMove,
  frontValue,
  figureWorth,
  heartWorth,
  inDanger,
  matchupBonus,
  reachAgainst,
  sidesOf,
  type Sides,
} from './aiEval';
import { legalActions } from './legal';
import { characterOf, currentHp, figureAt, memoriesFor, retreatCost, studyDiscount, topCard } from './rules';
import type { BattleAction, BattleState, Figure, FigureRef, PendingChoice, PlayerIndex } from './types';

export const AI_LEVELS = ['easy', 'normal', 'hard'] as const;
export type AiLevel = (typeof AI_LEVELS)[number];

interface Style {
  /** Chance that a decision is just random. */
  readonly blunder: number;
  /** Chance that the move to attack with is picked at random. */
  readonly sloppyAttack: number;
  /** Looks ahead at what the enemy could do next turn. */
  readonly aware: boolean;
  /** Retreats and swaps to get an attacker to the front. */
  readonly repositions: boolean;
}

const STYLES: Readonly<Record<AiLevel, Style>> = {
  easy: { blunder: 0.25, sloppyAttack: 0.45, aware: false, repositions: false },
  normal: { blunder: 0.13, sloppyAttack: 0.2, aware: false, repositions: true },
  hard: { blunder: 0, sloppyAttack: 0, aware: true, repositions: true },
};

/** Preparing actions below this many points are not worth doing. */
const WORTH_DOING = 2;

export interface Ai {
  readonly level: AiLevel;
  /** The next action of `me`. Give it the battle as `observe` shows it; it must be this player's turn to act. */
  choose(view: BattleState, me: PlayerIndex): BattleAction;
}

// --- Main phase ---------------------------------------------------------------------------------------------------------

function activeCanAttack(sides: Sides): boolean {
  const active = sides.mine.active;
  if (active === null) {
    return false;
  }
  return bestMove(sides, active, active.hearts, studyDiscount(sides.mine), sides.theirs.shieldTurn === sides.state.turn) !== null;
}

function worthOfPlayingBasic(sides: Sides, cardId: string): number {
  const card = characterOf(cardId);
  if (card === undefined) {
    return 0;
  }
  let points = sides.mine.bench.length < 2 ? 26 : 16;
  if (card.stage === 'event') {
    points += frontValue(card) * 0.3;
    if (card.ability?.timing === 'onPlay') {
      points += effectsWorth(sides, card.ability.effects, sides.mine.hand.length - 1);
    }
  }
  return points;
}

function worthOfEvolving(sides: Sides, cardId: string, target: FigureRef): number {
  const figure = figureAt(sides.mine, target);
  const card = characterOf(cardId);
  if (figure === undefined || card === undefined) {
    return 0;
  }
  const old = topCard(figure);
  const growth = (card.hp - old.hp) * 0.1 + (bestPrintedDamage(card) - bestPrintedDamage(old)) * 0.12;
  return 30 + growth + (target.zone === 'active' ? 12 : 0);
}

function worthOfAbility(sides: Sides, figure: Figure, ref: FigureRef, style: Style): number {
  const ability = topCard(figure).ability;
  if (ability === undefined) {
    return 0;
  }
  let points = 0;
  for (const effect of ability.effects) {
    switch (effect.type) {
      case 'switchOwnActive': {
        if (!style.repositions) {
          break;
        }
        const active = sides.mine.active;
        const mine = sides.mine;
        const discount = studyDiscount(mine);
        const bench = mine.bench.map((candidate) => bestMove(sides, candidate, candidate.hearts, discount, false)?.value ?? 0);
        const best = Math.max(0, ...bench);
        if (active !== null && !activeCanAttack(sides) && best > 0) {
          points += 36 + best * 0.3;
        } else if (inDanger(sides)) {
          points += 24;
        }
        break;
      }
      case 'peekTopMayBottom':
        points += 3;
        break;
      case 'attachHeart':
        points += heartWorth(sides, figure, ref.zone === 'active') + 6;
        break;
      default:
        points += effectsWorth(sides, [effect], sides.mine.hand.length);
        break;
    }
  }
  return points;
}

function worthOfRetreat(sides: Sides, benchIndex: number, style: Style): number {
  const active = sides.mine.active;
  const candidate = sides.mine.bench[benchIndex];
  if (!style.repositions || active === null || candidate === undefined) {
    return -1;
  }
  const lost = retreatCost(active) * 8;
  const discount = studyDiscount(sides.mine);
  const attack = bestMove(sides, candidate, candidate.hearts, discount, sides.theirs.shieldTurn === sides.state.turn);
  if (!activeCanAttack(sides) && attack !== null) {
    return 34 + attack.value * 0.3 - lost + matchupBonus(sides, candidate);
  }
  if (inDanger(sides) && figureWorth(candidate) + matchupBonus(sides, candidate) > figureWorth(active)) {
    return 22 - lost;
  }
  return -1;
}

function worthOfAction(sides: Sides, action: BattleAction, style: Style): number {
  const { mine } = sides;
  switch (action.type) {
    case 'play-basic':
      return worthOfPlayingBasic(sides, mine.hand[action.handIndex] ?? '');
    case 'evolve':
      return worthOfEvolving(sides, mine.hand[action.handIndex] ?? '', action.target);
    case 'give-heart': {
      const figure = figureAt(mine, action.target);
      return figure === undefined ? 0 : heartWorth(sides, figure, action.target.zone === 'active');
    }
    case 'play-supporter': {
      const card = cardById(mine.hand[action.handIndex] ?? '');
      return card?.kind === 'supporter' ? effectsWorth(sides, card.effects, mine.hand.length - 1) - 1 : 0;
    }
    case 'use-ability': {
      const figure = figureAt(mine, action.figure);
      return figure === undefined ? 0 : worthOfAbility(sides, figure, action.figure, style);
    }
    case 'retreat':
      return worthOfRetreat(sides, action.benchIndex, style);
    default:
      return 0;
  }
}

function pickAttack(sides: Sides, options: readonly BattleAction[], style: Style, rng: Rng): BattleAction | undefined {
  const active = sides.mine.active;
  const attacks = options.filter((action) => action.type === 'attack');
  if (active === null || attacks.length === 0) {
    return undefined;
  }
  if (attacks.length > 1 && rng.next() < style.sloppyAttack) {
    return rng.pick(attacks);
  }
  const shielded = sides.theirs.shieldTurn === sides.state.turn;
  let best: { readonly action: BattleAction; readonly value: number } | undefined;
  for (const action of attacks) {
    if (action.type !== 'attack') {
      continue;
    }
    const value = estimateMove(sides, active, action.moveIndex, shielded).value;
    if (best === undefined || value > best.value) {
      best = { action, value };
    }
  }
  return best?.action;
}

function chooseMain(sides: Sides, options: readonly BattleAction[], style: Style, rng: Rng): BattleAction {
  const end: BattleAction = { type: 'end-turn' };
  if (rng.next() < style.blunder) {
    return rng.pick(options);
  }
  let best: { readonly action: BattleAction; readonly value: number } | undefined;
  for (const action of options) {
    if (action.type === 'attack' || action.type === 'end-turn') {
      continue;
    }
    // A tiny random part keeps equal actions from always coming out in the same order.
    const value = worthOfAction(sides, action, style) + rng.next() * 0.01;
    if (best === undefined || value > best.value) {
      best = { action, value };
    }
  }
  if (best !== undefined && best.value > WORTH_DOING) {
    return best.action;
  }
  return pickAttack(sides, options, style, rng) ?? end;
}

// --- Setup ------------------------------------------------------------------------------------------------------------------

function chooseSetup(sides: Sides, options: readonly BattleAction[], rng: Rng, style: Style): BattleAction {
  const done = options.find((action) => action.type === 'setup-done');
  const places = options.filter((action) => action.type === 'setup-place');
  if (places.length === 0 && done !== undefined) {
    return done;
  }
  if (sides.mine.active !== null && done !== undefined && rng.next() < style.blunder) {
    return done;
  }
  let best: { readonly action: BattleAction; readonly value: number } | undefined;
  for (const action of places) {
    if (action.type !== 'setup-place') {
      continue;
    }
    const card = characterOf(sides.mine.hand[action.handIndex] ?? '');
    const value = (card === undefined ? 0 : frontValue(card)) + rng.next() * 0.01;
    if (best === undefined || value > best.value) {
      best = { action, value };
    }
  }
  const choice = best?.action ?? done;
  if (choice === undefined) {
    throw new Error('The computer has nothing to do in the setup.');
  }
  return choice;
}

// --- Questions --------------------------------------------------------------------------------------------------------------

function figurePoints(sides: Sides, pending: PendingChoice, ref: FigureRef): number {
  const prompt = pending.prompt;
  if (prompt.kind !== 'figure') {
    return 0;
  }
  const owner = sides.state.players[prompt.owner];
  const figure = figureAt(owner, ref);
  if (figure === undefined) {
    return Number.NEGATIVE_INFINITY;
  }
  const isActive = ref.zone === 'active';
  const mine = sides.mine;
  switch (prompt.reason) {
    case 'heal':
      return figure.damage + (isActive && inDanger(sides) ? 15 : 0) + (isActive ? 3 : 0);
    case 'give-heart':
      return heartWorth(sides, figure, isActive);
    case 'swap-in':
    case 'promote': {
      const attack = bestMove(sides, figure, figure.hearts, studyDiscount(mine), false);
      return figureWorth(figure) + (attack === null ? 0 : 30 + attack.value * 0.3) + matchupBonus(sides, figure);
    }
    case 'send-to-front': {
      // The enemy Character that comes to the front: one I can knock out now, else the weakest one.
      const attacker = mine.active;
      const reach = attacker === null ? 0 : reachAgainst(sides, attacker, figure);
      return reach >= currentHp(figure) ? 100 + memoriesFor(figure) * 10 : -figureWorth(figure);
    }
  }
}

function choosePrompt(sides: Sides, pending: PendingChoice, options: readonly BattleAction[], rng: Rng, style: Style): BattleAction {
  const answers = options.filter((action) => action.type === 'choose');
  const fallback = answers[0];
  if (fallback === undefined) {
    throw new Error('The computer has no answer to give.');
  }
  if (rng.next() < style.blunder) {
    return rng.pick(answers);
  }
  const prompt = pending.prompt;
  if (prompt.kind === 'yes-no') {
    // Keep a good card on top, send a poor one to the bottom.
    const move = cardWanted(sides, prompt.cardId) < 8;
    return { type: 'choose', option: move ? 0 : 1 };
  }
  let bestOption = -1;
  let bestPoints = Number.NEGATIVE_INFINITY;
  prompt.options.forEach((option, index) => {
    const points = 'cardId' in option ? cardWanted(sides, option.cardId) : figurePoints(sides, pending, option);
    if (points > bestPoints) {
      bestPoints = points;
      bestOption = index;
    }
  });
  // An optional Heart is only given when it does some good.
  if (prompt.optional && prompt.kind === 'figure' && bestPoints < WORTH_DOING) {
    return { type: 'choose', option: -1 };
  }
  return bestOption < 0 ? fallback : { type: 'choose', option: bestOption };
}

// --- The opponent ------------------------------------------------------------------------------------------------------------

export function createAi(level: AiLevel, seed: string): Ai {
  const rng = createRng(`ai:${level}:${seed}`);
  const style = STYLES[level];
  return {
    level,
    choose(view, me) {
      const options = legalActions(view, me);
      const only = options[0];
      if (only === undefined) {
        throw new Error('The computer has nothing it may do right now.');
      }
      if (options.length === 1) {
        return only;
      }
      const sides = sidesOf(view, me, style.aware);
      if (view.phase === 'setup') {
        return chooseSetup(sides, options, rng, style);
      }
      if (view.pending !== null) {
        return choosePrompt(sides, view.pending, options, rng, style);
      }
      return chooseMain(sides, options, style, rng);
    },
  };
}
