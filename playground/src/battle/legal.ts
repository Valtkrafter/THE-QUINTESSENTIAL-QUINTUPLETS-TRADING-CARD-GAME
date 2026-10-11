// What a player may do right now. The list is the single truth about the rules of a turn: the engine refuses everything
// that is not on it, the computer opponents choose from it and the battle screen only offers what is on it.

import { cardById } from '../cards/catalog';
import type { CharacterCard, Effect } from '../cards/model';
import { isBasicPlayable } from '../domain/decks';
import { BENCH_SIZE, canPayMove, figureAt, figureRefs, other, retreatCost, studyDiscount, topCard } from './rules';
import type { BattleAction, BattleState, Figure, FigureRef, PendingChoice, PlayerIndex, PlayerState } from './types';

/** Who has to be the one acting for this action to make sense. */
export function actorOf(state: BattleState, action: BattleAction): PlayerIndex | null {
  switch (action.type) {
    case 'setup-place':
    case 'setup-done':
    case 'concede':
      return action.player;
    case 'choose':
      return state.pending?.player ?? null;
    default:
      return state.current;
  }
}

// --- Rules of single actions -----------------------------------------------------------------------------------------

/** The player who goes first may not attack in their very first turn. */
export function attackingAllowed(state: BattleState, player: PlayerIndex): boolean {
  return !(state.first === player && state.players[player].turnsTaken <= 1);
}

/** A card is put on top of a Character that has been in play since an earlier turn, and each Character evolves once a turn. */
export function canEvolve(state: BattleState, owner: PlayerState, figure: Figure, card: CharacterCard): boolean {
  if (owner.turnsTaken <= 1 || figure.arrivedTurn >= state.turn || figure.evolvedTurn === state.turn) {
    return false;
  }
  const below = topCard(figure);
  const wanted = card.stage === 'close' ? 'basic' : card.stage === 'bride' ? 'close' : null;
  return wanted !== null && below.stage === wanted && below.character === card.character;
}

function effectCanDoSomething(owner: PlayerState, figure: Figure, effect: Effect): boolean {
  switch (effect.type) {
    case 'switchOwnActive':
      return owner.active !== null && owner.bench.length > 0;
    case 'peekTopMayBottom':
    case 'draw':
      return owner.deck.length > 0;
    case 'heal':
      if (effect.target === 'self') {
        return figure.damage > 0;
      }
      if (effect.target === 'allBenched') {
        return owner.bench.some((benched) => benched.damage > 0);
      }
      return [owner.active, ...owner.bench].some((own) => (own?.damage ?? 0) > 0);
    default:
      return true;
  }
}

/** A "once during your turn" ability that has not been used this turn and would do something. */
export function canUseAbility(state: BattleState, owner: PlayerState, figure: Figure): boolean {
  const ability = topCard(figure).ability;
  if (ability === undefined || ability.timing !== 'onceDuringTurn' || figure.abilityTurn === state.turn) {
    return false;
  }
  return ability.effects.some((effect) => effectCanDoSomething(owner, figure, effect));
}

export function canRetreat(owner: PlayerState): boolean {
  return !owner.retreated && owner.active !== null && owner.bench.length > 0 && owner.active.hearts >= retreatCost(owner.active);
}

/** Which of the Active Character's moves can be used now. */
export function usableMoves(state: BattleState, player: PlayerIndex): number[] {
  const owner = state.players[player];
  const active = owner.active;
  if (active === null || active.stunTurn === state.turn || !attackingAllowed(state, player)) {
    return [];
  }
  const discount = studyDiscount(owner);
  const usable: number[] = [];
  topCard(active).moves.forEach((move, index) => {
    if (canPayMove(active, move, discount)) {
      usable.push(index);
    }
  });
  return usable;
}

// --- The lists -----------------------------------------------------------------------------------------------------------

function setupActions(state: BattleState, player: PlayerIndex): BattleAction[] {
  const owner = state.players[player];
  if (owner.setupDone) {
    return [];
  }
  const actions: BattleAction[] = [];
  owner.hand.forEach((cardId, handIndex) => {
    const card = cardById(cardId);
    if (card === undefined || !isBasicPlayable(card)) {
      return;
    }
    if (owner.active === null) {
      actions.push({ type: 'setup-place', player, handIndex, to: 'active' });
    } else if (owner.bench.length < BENCH_SIZE) {
      actions.push({ type: 'setup-place', player, handIndex, to: 'bench' });
    }
  });
  if (owner.active !== null) {
    actions.push({ type: 'setup-done', player });
  }
  return actions;
}

function choiceActions(pending: PendingChoice): BattleAction[] {
  const prompt = pending.prompt;
  const count = prompt.kind === 'yes-no' ? 2 : prompt.options.length;
  const actions: BattleAction[] = Array.from({ length: count }, (_, option) => ({ type: 'choose', option }));
  if (prompt.kind !== 'yes-no' && prompt.optional) {
    actions.push({ type: 'choose', option: -1 });
  }
  return actions;
}

function mainActions(state: BattleState, player: PlayerIndex): BattleAction[] {
  const owner = state.players[player];
  const refs = figureRefs(owner);
  const actions: BattleAction[] = [];

  owner.hand.forEach((cardId, handIndex) => {
    const card = cardById(cardId);
    if (card === undefined) {
      return;
    }
    if (card.kind === 'supporter') {
      if (!owner.supporterPlayed) {
        actions.push({ type: 'play-supporter', handIndex });
      }
      return;
    }
    if (isBasicPlayable(card)) {
      if (owner.bench.length < BENCH_SIZE) {
        actions.push({ type: 'play-basic', handIndex });
      }
      return;
    }
    for (const target of refs) {
      const figure = figureAt(owner, target);
      if (figure !== undefined && canEvolve(state, owner, figure, card)) {
        actions.push({ type: 'evolve', handIndex, target });
      }
    }
  });

  if (!owner.heartGiven) {
    for (const target of refs) {
      actions.push({ type: 'give-heart', target });
    }
  }
  for (const figureRef of refs) {
    const figure = figureAt(owner, figureRef);
    if (figure !== undefined && canUseAbility(state, owner, figure)) {
      actions.push({ type: 'use-ability', figure: figureRef });
    }
  }
  if (canRetreat(owner)) {
    owner.bench.forEach((_, benchIndex) => actions.push({ type: 'retreat', benchIndex }));
  }
  for (const moveIndex of usableMoves(state, player)) {
    actions.push({ type: 'attack', moveIndex });
  }
  actions.push({ type: 'end-turn' });
  return actions;
}

/** Everything `player` may do in `state`. Giving up is always possible and is not listed. */
export function legalActions(state: BattleState, player: PlayerIndex): BattleAction[] {
  if (state.phase === 'over') {
    return [];
  }
  if (state.phase === 'setup') {
    return setupActions(state, player);
  }
  if (state.pending !== null) {
    return state.pending.player === player ? choiceActions(state.pending) : [];
  }
  return state.current === player ? mainActions(state, player) : [];
}

export function sameAction(a: BattleAction, b: BattleAction): boolean {
  switch (a.type) {
    case 'setup-place':
      return b.type === 'setup-place' && a.player === b.player && a.handIndex === b.handIndex && a.to === b.to;
    case 'setup-done':
      return b.type === 'setup-done' && a.player === b.player;
    case 'play-basic':
      return b.type === 'play-basic' && a.handIndex === b.handIndex;
    case 'evolve':
      return b.type === 'evolve' && a.handIndex === b.handIndex && sameRef(a.target, b.target);
    case 'give-heart':
      return b.type === 'give-heart' && sameRef(a.target, b.target);
    case 'play-supporter':
      return b.type === 'play-supporter' && a.handIndex === b.handIndex;
    case 'use-ability':
      return b.type === 'use-ability' && sameRef(a.figure, b.figure);
    case 'retreat':
      return b.type === 'retreat' && a.benchIndex === b.benchIndex;
    case 'attack':
      return b.type === 'attack' && a.moveIndex === b.moveIndex;
    case 'end-turn':
      return b.type === 'end-turn';
    case 'choose':
      return b.type === 'choose' && a.option === b.option;
    case 'concede':
      return b.type === 'concede' && a.player === b.player;
  }
}

function sameRef(a: FigureRef, b: FigureRef): boolean {
  return a.zone === 'active' ? b.zone === 'active' : b.zone === 'bench' && a.index === b.index;
}

/** True when `action` is allowed in `state` (giving up always is, until the battle is over). */
export function isLegal(state: BattleState, action: BattleAction): boolean {
  const actor = actorOf(state, action);
  if (actor === null || state.phase === 'over') {
    return false;
  }
  if (action.type === 'concede') {
    return true;
  }
  return legalActions(state, actor).some((candidate) => sameAction(candidate, action));
}

/** The player who has to act next: whoever must answer, else the one whose turn it is, else (in setup) the first not ready. */
export function playerToAct(state: BattleState): PlayerIndex | null {
  if (state.phase === 'over') {
    return null;
  }
  if (state.pending !== null) {
    return state.pending.player;
  }
  if (state.phase === 'main') {
    return state.current;
  }
  const order: PlayerIndex[] = [state.first, other(state.first)];
  return order.find((player) => !state.players[player].setupDone) ?? null;
}
