// Runs the effects of cards. Every effect is data (cards/schema.ts) and this file is the only place that knows what each
// one does. Effects that need a decision ("heal one of your Characters", "take one card") stop and leave a pending choice
// in the state, together with the effects that still have to run; answering it carries on from there.

import type { Effect } from '../cards/model';
import { cardById } from '../cards/catalog';
import {
  deckToBench,
  drawCards,
  figureByRef,
  giveHearts,
  healFigure,
  ownFigures,
  refsOf,
  shuffleDeck,
  shuffleHandAndDraw,
  swapWithBench,
} from './ops';
import { BENCH_SIZE, HEADS_CHANCE, other } from './rules';
import { emit, playerOf, type MutableFigure, type Run } from './run';
import type { ChoicePrompt, EffectContext, FigureReason, FigureRef, PlayerIndex } from './types';

/** The answer to a pending choice: what was picked and what was asked. */
export interface Answer {
  readonly option: number;
  readonly prompt: ChoicePrompt;
}

/** The answer that skips an optional choice. */
export const SKIP = -1;

type CardOption = { readonly index: number; readonly cardId: string };

function ask(run: Run, chooser: PlayerIndex, prompt: ChoicePrompt, effect: Effect, queue: readonly Effect[], context: EffectContext, done: number): true {
  run.state.pending = { player: chooser, prompt, step: { kind: 'effect', effect, remaining: [...queue], context, done } };
  return true;
}

function figurePrompt(owner: PlayerIndex, reason: FigureReason, options: readonly FigureRef[], optional: boolean): ChoicePrompt {
  return { kind: 'figure', reason, owner, options, optional };
}

function pickedFigure(answer: Answer | undefined): FigureRef | undefined {
  return answer !== undefined && answer.prompt.kind === 'figure' ? answer.prompt.options[answer.option] : undefined;
}

function pickedCard(answer: Answer | undefined): CardOption | undefined {
  return answer !== undefined && answer.prompt.kind === 'card' ? answer.prompt.options[answer.option] : undefined;
}

function selfFigure(run: Run, context: EffectContext): MutableFigure | undefined {
  return ownFigures(playerOf(run, context.player)).find((figure) => figure.uid === context.figureUid);
}

/** Each different card of the deck that passes the test, with the place of its first copy. */
function distinctDeckCards(deck: readonly string[], test: (cardId: string) => boolean): CardOption[] {
  const seen = new Set<string>();
  const options: CardOption[] = [];
  deck.forEach((cardId, index) => {
    if (!seen.has(cardId) && test(cardId)) {
      seen.add(cardId);
      options.push({ index, cardId });
    }
  });
  return options;
}

function isBasicCharacter(cardId: string): boolean {
  const card = cardById(cardId);
  return card?.kind === 'character' && card.stage === 'basic';
}

function isSupporter(cardId: string): boolean {
  return cardById(cardId)?.kind === 'supporter';
}

// --- Single effects ------------------------------------------------------------------------------------------------

function peekTop(run: Run, effect: Effect, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const player = playerOf(run, context.player);
  if (answer === undefined) {
    const top = player.deck[0];
    if (top === undefined) {
      return false;
    }
    return ask(run, context.player, { kind: 'yes-no', reason: 'move-to-bottom', cardId: top }, effect, queue, context, done);
  }
  if (answer.option === 0) {
    const card = player.deck.shift();
    if (card !== undefined) {
      player.deck.push(card);
    }
  }
  return false;
}

function lookAtTop(run: Run, effect: Extract<Effect, { type: 'lookTopTakeOne' }>, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const player = playerOf(run, context.player);
  if (answer === undefined) {
    const options = player.deck.slice(0, effect.count).map((cardId, index) => ({ index, cardId }));
    if (options.length === 0) {
      return false;
    }
    return ask(run, context.player, { kind: 'card', reason: 'take-from-top', options, optional: false }, effect, queue, context, done);
  }
  const picked = pickedCard(answer);
  if (picked !== undefined && answer.prompt.kind === 'card') {
    // The looked-at cards leave the top; the chosen one goes to the hand and the rest to the bottom in the same order.
    const looked = player.deck.splice(0, answer.prompt.options.length);
    const [taken] = looked.splice(picked.index, 1);
    if (taken !== undefined) {
      player.hand.push(taken);
      emit(run, { type: 'draw', player: context.player, count: 1, cardIds: [taken] });
    }
    player.deck.push(...looked);
  }
  return false;
}

function searchBasics(run: Run, effect: Extract<Effect, { type: 'searchBasicToBench' }>, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const me = context.player;
  const player = playerOf(run, me);
  let progress = done;
  let stop = false;
  if (answer !== undefined) {
    const picked = pickedCard(answer);
    if (picked === undefined) {
      stop = true;
    } else if (deckToBench(run, me, picked.index)) {
      progress += 1;
    }
  }
  const options = distinctDeckCards(player.deck, isBasicCharacter);
  if (stop || progress >= effect.count || player.bench.length >= BENCH_SIZE || options.length === 0) {
    shuffleDeck(run, me);
    return false;
  }
  return ask(run, me, { kind: 'card', reason: 'find-basic', options, optional: true }, effect, queue, context, progress);
}

function searchSupporters(run: Run, effect: Extract<Effect, { type: 'searchSupporter' }>, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const me = context.player;
  const player = playerOf(run, me);
  if (answer === undefined) {
    const options = distinctDeckCards(player.deck, isSupporter);
    if (options.length === 0) {
      shuffleDeck(run, me);
      return false;
    }
    return ask(run, me, { kind: 'card', reason: 'find-supporter', options, optional: true }, effect, queue, context, done);
  }
  const picked = pickedCard(answer);
  if (picked !== undefined) {
    const [taken] = player.deck.splice(picked.index, 1);
    if (taken !== undefined) {
      player.hand.push(taken);
      emit(run, { type: 'draw', player: me, count: 1, cardIds: [taken] });
    }
  }
  shuffleDeck(run, me);
  return false;
}

function heal(run: Run, effect: Extract<Effect, { type: 'heal' }>, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const me = context.player;
  const player = playerOf(run, me);
  switch (effect.target) {
    case 'self': {
      const figure = selfFigure(run, context);
      if (figure !== undefined) {
        healFigure(run, me, figure, effect.amount);
      }
      return false;
    }
    case 'allOwn':
      for (const figure of ownFigures(player)) {
        healFigure(run, me, figure, effect.amount);
      }
      return false;
    case 'allBenched':
      for (const figure of [...player.bench]) {
        healFigure(run, me, figure, effect.amount);
      }
      return false;
    case 'chosenOwn': {
      const picked = pickedFigure(answer);
      if (answer !== undefined) {
        const figure = picked === undefined ? undefined : figureByRef(player, picked);
        if (figure !== undefined) {
          healFigure(run, me, figure, effect.amount);
        }
        return false;
      }
      const options = refsOf(player).filter((ref) => (figureByRef(player, ref)?.damage ?? 0) > 0);
      const [only] = options;
      if (only === undefined) {
        return false;
      }
      if (options.length === 1) {
        const figure = figureByRef(player, only);
        if (figure !== undefined) {
          healFigure(run, me, figure, effect.amount);
        }
        return false;
      }
      return ask(run, me, figurePrompt(me, 'heal', options, false), effect, queue, context, done);
    }
  }
}

function attachHeart(run: Run, effect: Extract<Effect, { type: 'attachHeart' }>, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const me = context.player;
  const player = playerOf(run, me);
  if (effect.target === 'self') {
    const figure = selfFigure(run, context);
    if (figure !== undefined) {
      giveHearts(run, me, figure, effect.count);
    }
    return false;
  }
  const options = effect.target === 'chosenBenched' ? player.bench.map((_, index): FigureRef => ({ zone: 'bench', index })) : refsOf(player);
  if (effect.target === 'splitAnyOwn') {
    // One Heart at a time, as often as the card allows; the player may stop early.
    let progress = done;
    if (answer !== undefined) {
      const picked = pickedFigure(answer);
      const figure = picked === undefined ? undefined : figureByRef(player, picked);
      if (figure === undefined) {
        return false;
      }
      giveHearts(run, me, figure, 1);
      progress += 1;
    }
    if (progress >= effect.count || options.length === 0) {
      return false;
    }
    return ask(run, me, figurePrompt(me, 'give-heart', options, true), effect, queue, context, progress);
  }
  if (answer !== undefined) {
    const picked = pickedFigure(answer);
    const figure = picked === undefined ? undefined : figureByRef(player, picked);
    if (figure !== undefined) {
      giveHearts(run, me, figure, effect.count);
    }
    return false;
  }
  const [only] = options;
  if (only === undefined) {
    return false;
  }
  if (options.length === 1) {
    const figure = figureByRef(player, only);
    if (figure !== undefined) {
      giveHearts(run, me, figure, effect.count);
    }
    return false;
  }
  return ask(run, me, figurePrompt(me, 'give-heart', options, false), effect, queue, context, done);
}

/** Swaps a Benched Character of `owner` into the front; `chooser` decides which one. */
function switchActive(
  run: Run,
  effect: Effect,
  queue: Effect[],
  context: EffectContext,
  done: number,
  answer: Answer | undefined,
  owner: PlayerIndex,
  reason: FigureReason,
): boolean {
  const player = playerOf(run, owner);
  if (answer !== undefined) {
    const picked = pickedFigure(answer);
    if (picked !== undefined && picked.zone === 'bench') {
      swapWithBench(run, owner, picked.index);
    }
    return false;
  }
  const options = player.bench.map((_, index): FigureRef => ({ zone: 'bench', index }));
  const [only] = options;
  if (only === undefined || player.active === null) {
    return false;
  }
  if (options.length === 1 && only.zone === 'bench') {
    swapWithBench(run, owner, only.index);
    return false;
  }
  return ask(run, context.player, figurePrompt(owner, reason, options, false), effect, queue, context, done);
}

/**
 * Runs one effect. Returns true when it needs an answer (the pending choice is then set and holds `queue`), false when it
 * is finished and the next effect may run. `done` and `answer` are only given when an earlier question of this effect is answered.
 */
export function applyEffect(run: Run, effect: Effect, queue: Effect[], context: EffectContext, done: number, answer: Answer | undefined): boolean {
  const me = context.player;
  const foe = other(me);
  switch (effect.type) {
    case 'draw':
      drawCards(run, me, effect.count);
      return false;
    case 'drawUntilHandSize':
      drawCards(run, me, effect.size - playerOf(run, me).hand.length);
      return false;
    case 'peekTopMayBottom':
      return peekTop(run, effect, queue, context, done, answer);
    case 'lookTopTakeOne':
      return lookAtTop(run, effect, queue, context, done, answer);
    case 'searchBasicToBench':
      return searchBasics(run, effect, queue, context, done, answer);
    case 'searchSupporter':
      return searchSupporters(run, effect, queue, context, done, answer);
    case 'shuffleHandDraw':
      shuffleHandAndDraw(run, me, effect.count);
      return false;
    case 'bothShuffleHandDraw':
      shuffleHandAndDraw(run, me, effect.count);
      shuffleHandAndDraw(run, foe, effect.count);
      return false;
    case 'opponentShuffleHandDraw':
      shuffleHandAndDraw(run, foe, effect.count);
      return false;
    case 'heal':
      return heal(run, effect, queue, context, done, answer);
    case 'attachHeart':
      return attachHeart(run, effect, queue, context, done, answer);
    case 'switchOwnActive':
      return switchActive(run, effect, queue, context, done, answer, me, 'swap-in');
    case 'forceOpponentSwitch':
      return switchActive(run, effect, queue, context, done, answer, foe, 'send-to-front');
    case 'discardHearts': {
      const target = playerOf(run, foe).active;
      if (target !== null) {
        const removed = Math.min(effect.count, target.hearts);
        if (removed > 0) {
          target.hearts -= removed;
          emit(run, { type: 'hearts-removed', player: foe, count: removed });
        }
      }
      return false;
    }
    case 'preventAttackNextTurn': {
      const target = playerOf(run, foe).active;
      if (target !== null) {
        target.stunTurn = run.state.turn + 1;
        emit(run, { type: 'stun', player: foe });
      }
      return false;
    }
    case 'shieldActiveNextTurn':
      playerOf(run, me).shieldTurn = run.state.turn + 1;
      emit(run, { type: 'shield', player: me });
      return false;
    case 'coinFlip': {
      const heads = run.rng.next() < HEADS_CHANCE;
      emit(run, { type: 'coin', heads });
      queue.unshift(...(heads ? effect.heads : effect.tails));
      return false;
    }
    // Rules that work all the time, and the extra damage of a move: the engine reads them where they matter.
    case 'damagePerHeart':
    case 'damagePerCount':
    case 'reduceDamageTaken':
    case 'coinSurvive':
    case 'reduceStudyCost':
      return false;
  }
}

/** Runs the effects one after the other until all are done or one of them needs an answer. */
export function runEffects(run: Run, effects: readonly Effect[], context: EffectContext): void {
  const queue = [...effects];
  while (queue.length > 0 && run.state.pending === null) {
    const effect = queue.shift();
    if (effect === undefined || applyEffect(run, effect, queue, context, 0, undefined)) {
      return;
    }
  }
}

/** Carries on after a question of an effect was answered. */
export function resumeEffects(run: Run, answer: Answer): void {
  const pending = run.state.pending;
  if (pending === null || pending.step.kind !== 'effect') {
    return;
  }
  run.state.pending = null;
  const { effect, remaining, context, done } = pending.step;
  const queue = [...remaining];
  if (!applyEffect(run, effect, queue, context, done, answer)) {
    runEffects(run, queue, context);
  }
}
