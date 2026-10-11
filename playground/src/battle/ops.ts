// The small things that happen on the board: drawing, shuffling, healing, giving Hearts, swapping places. Effects and the
// turn flow are built from these, and each one tells the screen what happened through an event.

import { BENCH_SIZE, figureRefs, topCard } from './rules';
import { emit, playerOf, type MutableFigure, type MutablePlayer, type Run } from './run';
import type { FigureRef, PlayerIndex } from './types';

export function refOf(player: MutablePlayer, figure: MutableFigure): FigureRef {
  if (player.active === figure) {
    return { zone: 'active' };
  }
  return { zone: 'bench', index: player.bench.indexOf(figure) };
}

export function figureByRef(player: MutablePlayer, ref: FigureRef): MutableFigure | undefined {
  return ref.zone === 'active' ? (player.active ?? undefined) : player.bench[ref.index];
}

/** The Characters of a player: Active first, then the Bench. */
export function ownFigures(player: MutablePlayer): MutableFigure[] {
  return player.active === null ? [...player.bench] : [player.active, ...player.bench];
}

export function refsOf(player: MutablePlayer): FigureRef[] {
  return figureRefs(player);
}

export function newFigure(run: Run, cardId: string, turn: number): MutableFigure {
  const uid = run.state.nextUid;
  run.state.nextUid += 1;
  return { uid, stack: [cardId], hearts: 0, damage: 0, arrivedTurn: turn, evolvedTurn: 0, abilityTurn: 0, stunTurn: 0 };
}

/** Draws up to `count` cards (fewer when the deck runs out). Returns how many were drawn. */
export function drawCards(run: Run, index: PlayerIndex, count: number): number {
  const player = playerOf(run, index);
  const cardIds = player.deck.splice(0, Math.max(0, count));
  if (cardIds.length > 0) {
    player.hand.push(...cardIds);
    emit(run, { type: 'draw', player: index, count: cardIds.length, cardIds });
  }
  return cardIds.length;
}

export function shuffleDeck(run: Run, index: PlayerIndex): void {
  const player = playerOf(run, index);
  player.deck = run.rng.shuffle(player.deck);
  emit(run, { type: 'shuffle', player: index });
}

/** Puts the whole hand into the deck, shuffles, and draws `count` new cards. */
export function shuffleHandAndDraw(run: Run, index: PlayerIndex, count: number): void {
  const player = playerOf(run, index);
  player.deck.push(...player.hand);
  player.hand = [];
  shuffleDeck(run, index);
  drawCards(run, index, count);
}

/** Takes damage off one Character. Tells the screen how much was really healed. */
export function healFigure(run: Run, index: PlayerIndex, figure: MutableFigure, amount: number): void {
  const healed = Math.min(amount, figure.damage);
  if (healed <= 0) {
    return;
  }
  figure.damage -= healed;
  emit(run, { type: 'heal', player: index, target: refOf(playerOf(run, index), figure), amount: healed });
}

export function giveHearts(run: Run, index: PlayerIndex, figure: MutableFigure, count: number): void {
  if (count <= 0) {
    return;
  }
  figure.hearts += count;
  emit(run, { type: 'heart', player: index, target: refOf(playerOf(run, index), figure), count });
}

/** Swaps the Active Character with the Benched one at `benchIndex`. */
export function swapWithBench(run: Run, index: PlayerIndex, benchIndex: number): void {
  const player = playerOf(run, index);
  const incoming = player.bench[benchIndex];
  const outgoing = player.active;
  if (incoming === undefined || outgoing === null) {
    return;
  }
  player.bench[benchIndex] = outgoing;
  player.active = incoming;
  emit(run, { type: 'swap', player: index, toActive: topCard(incoming).id });
}

/** Moves a card from the deck (at `deckIndex`) onto the Bench as a new Character. Returns false when there is no room. */
export function deckToBench(run: Run, index: PlayerIndex, deckIndex: number): boolean {
  const player = playerOf(run, index);
  const cardId = player.deck[deckIndex];
  if (cardId === undefined || player.bench.length >= BENCH_SIZE) {
    return false;
  }
  player.deck.splice(deckIndex, 1);
  const figure = newFigure(run, cardId, run.state.turn);
  player.bench.push(figure);
  emit(run, { type: 'play', player: index, cardId, target: { zone: 'bench', index: player.bench.length - 1 }, how: 'bench' });
  return true;
}
