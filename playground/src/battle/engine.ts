// The battle engine. A battle is a state and a list of actions: `createBattle` makes the first state, `step` takes one state
// and one action and gives back the new state plus the events that happened (or the reason the action was refused). Nothing
// here knows about screens or time, and all chance comes from the seeded random generator inside the state, so a battle can
// be replayed, simulated and tested.

import { cardById } from '../cards/catalog';
import { checkDeck, isBasicPlayable } from '../domain/decks';
import { createRng } from '../domain/random';
import { resumeEffects, runEffects } from './effects';
import { isLegal } from './legal';
import { drawCards, giveHearts, newFigure, swapWithBench } from './ops';
import {
  HEADS_CHANCE,
  MAX_MULLIGANS,
  MEMORIES_TO_WIN,
  START_HAND,
  TURN_LIMIT,
  baseDamage,
  damageAgainst,
  isKnockedOut,
  maxHp,
  memoriesFor,
  other,
  retreatCost,
  survivalHp,
  topCard,
} from './rules';
import { emit, endRun, playerOf, startRun, type MutableFigure, type MutablePlayer, type Run } from './run';
import type { BattleAction, BattleEvent, BattleState, EndReason, FigureRef, PlayerIndex, PlayerState, StepResult } from './types';

export interface BattleSetup {
  /** The two decks (card ids, one entry per copy). They must be legal; see domain/decks.ts. */
  readonly decks: readonly [readonly string[], readonly string[]];
  /** The same seed and the same actions always give the same battle. */
  readonly seed: string;
  /** Who goes first. A coin flip decides when left out. */
  readonly first?: PlayerIndex;
}

export type CreateResult =
  | { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] }
  | { readonly ok: false; readonly error: string };

function emptyPlayer(deck: readonly string[]): PlayerState {
  return {
    deck,
    hand: [],
    discard: [],
    active: null,
    bench: [],
    memories: 0,
    turnsTaken: 0,
    heartsGiven: 0,
    supporterPlayed: false,
    retreated: false,
    shieldTurn: 0,
    setupDone: false,
  };
}

function hasBasic(hand: readonly string[]): boolean {
  return hand.some((cardId) => {
    const card = cardById(cardId);
    return card !== undefined && isBasicPlayable(card);
  });
}

/** Deals five cards. A hand without a Character to start with is shown, shuffled back and dealt again. */
function dealOpeningHand(run: Run, index: PlayerIndex): void {
  const player = playerOf(run, index);
  drawCards(run, index, START_HAND);
  let redeals = 0;
  while (!hasBasic(player.hand)) {
    if (redeals >= MAX_MULLIGANS) {
      // Cannot happen with a legal deck in any normal run; this keeps a battle from ever getting stuck.
      const spot = player.deck.findIndex((cardId) => hasBasic([cardId]));
      const [dealt] = spot < 0 ? [] : player.deck.splice(spot, 1);
      const [dropped] = player.hand.splice(player.hand.length - 1, 1);
      if (dealt !== undefined) {
        player.hand.push(dealt);
      }
      if (dropped !== undefined) {
        player.deck.push(dropped);
      }
      return;
    }
    redeals += 1;
    run.state.mulligans[index] += 1;
    emit(run, { type: 'mulligan', player: index });
    player.deck.push(...player.hand);
    player.hand = [];
    player.deck = run.rng.shuffle(player.deck);
    drawCards(run, index, START_HAND);
  }
}

export function createBattle(setup: BattleSetup): CreateResult {
  for (const [number, deck] of setup.decks.entries()) {
    const problem = checkDeck(deck)[0];
    if (problem !== undefined) {
      return { ok: false, error: `Deck ${number + 1} is not legal (${problem.code}).` };
    }
  }
  const rng = createRng(`battle:${setup.seed}`);
  const decks = [rng.shuffle(setup.decks[0]), rng.shuffle(setup.decks[1])] as const;
  const events: BattleEvent[] = [];
  let first: PlayerIndex;
  if (setup.first === undefined) {
    const heads = rng.next() < HEADS_CHANCE;
    events.push({ type: 'coin', heads });
    first = heads ? 0 : 1;
  } else {
    first = setup.first;
  }
  const start: BattleState = {
    phase: 'setup',
    turn: 0,
    current: first,
    first,
    players: [emptyPlayer(decks[0]), emptyPlayer(decks[1])],
    pending: null,
    attacking: null,
    winner: null,
    endReason: null,
    rng: rng.state(),
    nextUid: 1,
    mulligans: [0, 0],
  };
  const run = startRun(start);
  run.events.push(...events);
  dealOpeningHand(run, first);
  dealOpeningHand(run, other(first));
  return { ok: true, ...endRun(run) };
}

// --- The flow of a battle ----------------------------------------------------------------------------------------------

function endGame(run: Run, winner: PlayerIndex | 'draw', reason: EndReason): void {
  const state = run.state;
  state.phase = 'over';
  state.winner = winner;
  state.endReason = reason;
  state.pending = null;
  state.attacking = null;
  emit(run, { type: 'over', winner, reason });
}

/** The turn limit: the player with more Memories wins. */
function endByLimit(run: Run): void {
  const [a, b] = run.state.players;
  endGame(run, a.memories === b.memories ? 'draw' : a.memories > b.memories ? 0 : 1, 'turn-limit');
}

function beginTurn(run: Run, index: PlayerIndex): void {
  const state = run.state;
  if (state.turn >= TURN_LIMIT) {
    endByLimit(run);
    return;
  }
  state.turn += 1;
  state.current = index;
  const player = playerOf(run, index);
  player.turnsTaken += 1;
  player.heartsGiven = 0;
  player.supporterPlayed = false;
  player.retreated = false;
  emit(run, { type: 'turn', turn: state.turn, player: index });
  if (drawCards(run, index, 1) === 0) {
    // Nothing left to draw at the start of the turn: that player loses.
    endGame(run, other(index), 'deck-out');
  }
}

function endTurn(run: Run): void {
  beginTurn(run, other(run.state.current));
}

function discardPile(player: MutablePlayer, figure: MutableFigure): void {
  player.discard.push(...figure.stack);
}

/** The Active Character was knocked out: its cards go to the discard pile and the opponent gets Memories. */
function knockOut(run: Run, loser: PlayerIndex): void {
  const player = playerOf(run, loser);
  const figure = player.active;
  if (figure === null) {
    return;
  }
  const memories = memoriesFor(figure);
  emit(run, { type: 'knock-out', player: loser, cardId: topCard(figure).id, memories });
  discardPile(player, figure);
  player.active = null;
  const winner = playerOf(run, other(loser));
  winner.memories += memories;
  if (winner.memories >= MEMORIES_TO_WIN) {
    endGame(run, other(loser), 'memories');
  }
}

/** "Third Time's the Charm": a coin may save a Character that would be knocked out. */
function survives(run: Run, index: PlayerIndex, figure: MutableFigure): boolean {
  const hp = survivalHp(figure);
  if (hp === null) {
    return false;
  }
  const heads = run.rng.next() < HEADS_CHANCE;
  emit(run, { type: 'coin', heads });
  if (!heads) {
    return false;
  }
  figure.damage = Math.max(0, maxHp(figure) - hp);
  emit(run, { type: 'survive', player: index, cardId: topCard(figure).id });
  return true;
}

/** A Benched Character steps up to the front after the Active Character was knocked out. */
function promote(run: Run, index: PlayerIndex, benchIndex: number): void {
  const player = playerOf(run, index);
  const [promoted] = player.bench.splice(benchIndex, 1);
  if (promoted !== undefined) {
    player.active = promoted;
    emit(run, { type: 'promote', player: index, cardId: topCard(promoted).id });
  }
}

/** After the effects of a move: knock-outs, a new Active Character if one fell, then the turn passes. */
function finishAttack(run: Run): void {
  const attacker = run.state.attacking;
  if (attacker === null) {
    return;
  }
  run.state.attacking = null;
  const defenderIndex = other(attacker);
  const defender = playerOf(run, defenderIndex);
  const front = defender.active;
  if (front !== null && isKnockedOut(front) && !survives(run, defenderIndex, front)) {
    knockOut(run, defenderIndex);
    if (run.state.phase === 'over') {
      return;
    }
    if (defender.bench.length === 0) {
      endGame(run, attacker, 'no-fighters');
      return;
    }
    if (defender.bench.length === 1) {
      // No choice to make: the only Benched Character steps up.
      promote(run, defenderIndex, 0);
      endTurn(run);
      return;
    }
    run.state.pending = {
      player: defenderIndex,
      prompt: {
        kind: 'figure',
        reason: 'promote',
        owner: defenderIndex,
        options: defender.bench.map((_, index): FigureRef => ({ zone: 'bench', index })),
        optional: false,
      },
      step: { kind: 'promote' },
    };
    return;
  }
  endTurn(run);
}

/** Carries the battle on whenever nothing is waiting for an answer. */
function settle(run: Run): void {
  const state = run.state;
  if (state.phase !== 'main' || state.pending !== null || state.attacking === null) {
    return;
  }
  finishAttack(run);
}

// --- Actions -----------------------------------------------------------------------------------------------------------

function takeFromHand(player: MutablePlayer, handIndex: number): string | undefined {
  return player.hand.splice(handIndex, 1)[0];
}

function figureAtRef(player: MutablePlayer, ref: FigureRef): MutableFigure | undefined {
  return ref.zone === 'active' ? (player.active ?? undefined) : player.bench[ref.index];
}

function playOnBench(run: Run, index: PlayerIndex, handIndex: number): void {
  const player = playerOf(run, index);
  const cardId = takeFromHand(player, handIndex);
  if (cardId === undefined) {
    return;
  }
  const figure = newFigure(run, cardId, run.state.turn);
  player.bench.push(figure);
  emit(run, { type: 'play', player: index, cardId, target: { zone: 'bench', index: player.bench.length - 1 }, how: 'bench' });
  const ability = topCard(figure).ability;
  if (ability?.timing === 'onPlay') {
    emit(run, { type: 'ability', player: index, cardId, name: ability.name });
    runEffects(run, ability.effects, { player: index, origin: 'ability', figureUid: figure.uid });
  }
}

function evolve(run: Run, index: PlayerIndex, handIndex: number, target: FigureRef): void {
  const player = playerOf(run, index);
  const figure = figureAtRef(player, target);
  const cardId = takeFromHand(player, handIndex);
  if (figure === undefined || cardId === undefined) {
    return;
  }
  figure.stack.push(cardId);
  figure.evolvedTurn = run.state.turn;
  emit(run, { type: 'play', player: index, cardId, target, how: 'evolve' });
}

function playSupporter(run: Run, index: PlayerIndex, handIndex: number): void {
  const player = playerOf(run, index);
  const cardId = takeFromHand(player, handIndex);
  const card = cardId === undefined ? undefined : cardById(cardId);
  if (cardId === undefined || card?.kind !== 'supporter') {
    return;
  }
  player.discard.push(cardId);
  player.supporterPlayed = true;
  emit(run, { type: 'supporter', player: index, cardId });
  runEffects(run, card.effects, { player: index, origin: 'supporter', figureUid: null });
}

function activateAbility(run: Run, index: PlayerIndex, ref: FigureRef): void {
  const figure = figureAtRef(playerOf(run, index), ref);
  const ability = figure === undefined ? undefined : topCard(figure).ability;
  if (figure === undefined || ability === undefined) {
    return;
  }
  figure.abilityTurn = run.state.turn;
  emit(run, { type: 'ability', player: index, cardId: topCard(figure).id, name: ability.name });
  runEffects(run, ability.effects, { player: index, origin: 'ability', figureUid: figure.uid });
}

function retreat(run: Run, index: PlayerIndex, benchIndex: number): void {
  const player = playerOf(run, index);
  const active = player.active;
  if (active === null) {
    return;
  }
  const cost = retreatCost(active);
  active.hearts -= cost;
  player.retreated = true;
  emit(run, { type: 'retreat', player: index, cost });
  swapWithBench(run, index, benchIndex);
}

function attack(run: Run, moveIndex: number): void {
  const state = run.state;
  const me = state.current;
  const attackerSide = playerOf(run, me);
  const defenderSide = playerOf(run, other(me));
  const attacker = attackerSide.active;
  const defender = defenderSide.active;
  const card = attacker === null ? undefined : topCard(attacker);
  const move = card?.moves[moveIndex];
  if (attacker === null || defender === null || card === undefined || move === undefined) {
    return;
  }
  const result = damageAgainst(baseDamage(move, attacker, attackerSide), card, defender, defenderSide.shieldTurn === state.turn);
  defender.damage += result.damage;
  emit(run, { type: 'attack', player: me, cardId: card.id, move: move.name, ...result });
  state.attacking = me;
  runEffects(run, move.effects, { player: me, origin: 'move', figureUid: attacker.uid });
}

/** Answers the question the battle is waiting on. */
function choose(run: Run, option: number): void {
  const pending = run.state.pending;
  if (pending === null) {
    return;
  }
  if (pending.step.kind === 'promote') {
    run.state.pending = null;
    const picked = pending.prompt.kind === 'figure' ? pending.prompt.options[option] : undefined;
    if (picked?.zone === 'bench') {
      promote(run, pending.player, picked.index);
    }
    endTurn(run);
    return;
  }
  resumeEffects(run, { option, prompt: pending.prompt });
}

function placeInSetup(run: Run, index: PlayerIndex, handIndex: number, to: 'active' | 'bench'): void {
  const player = playerOf(run, index);
  const cardId = takeFromHand(player, handIndex);
  if (cardId === undefined) {
    return;
  }
  const figure = newFigure(run, cardId, 0);
  if (to === 'active') {
    player.active = figure;
  } else {
    player.bench.push(figure);
  }
  const target: FigureRef = to === 'active' ? { zone: 'active' } : { zone: 'bench', index: player.bench.length - 1 };
  emit(run, { type: 'play', player: index, cardId, target, how: 'setup' });
}

function perform(run: Run, action: BattleAction): void {
  const state = run.state;
  const me = state.current;
  switch (action.type) {
    case 'setup-place':
      placeInSetup(run, action.player, action.handIndex, action.to);
      return;
    case 'setup-done': {
      playerOf(run, action.player).setupDone = true;
      if (state.players.every((player) => player.setupDone)) {
        state.phase = 'main';
        beginTurn(run, state.first);
      }
      return;
    }
    case 'play-basic':
      playOnBench(run, me, action.handIndex);
      break;
    case 'evolve':
      evolve(run, me, action.handIndex, action.target);
      break;
    case 'give-heart': {
      const figure = figureAtRef(playerOf(run, me), action.target);
      if (figure !== undefined) {
        playerOf(run, me).heartsGiven += 1;
        giveHearts(run, me, figure, 1);
      }
      break;
    }
    case 'play-supporter':
      playSupporter(run, me, action.handIndex);
      break;
    case 'use-ability':
      activateAbility(run, me, action.figure);
      break;
    case 'retreat':
      retreat(run, me, action.benchIndex);
      break;
    case 'attack':
      attack(run, action.moveIndex);
      break;
    case 'end-turn':
      endTurn(run);
      return;
    case 'choose':
      choose(run, action.option);
      break;
    case 'concede':
      endGame(run, other(action.player), 'concede');
      return;
  }
  settle(run);
}

/** Does one action. A refused action changes nothing and says why. */
export function step(state: BattleState, action: BattleAction): StepResult {
  if (!isLegal(state, action)) {
    return { ok: false, state, events: [], error: `The action "${action.type}" is not allowed right now.` };
  }
  const run = startRun(state);
  perform(run, action);
  return { ok: true, ...endRun(run) };
}
