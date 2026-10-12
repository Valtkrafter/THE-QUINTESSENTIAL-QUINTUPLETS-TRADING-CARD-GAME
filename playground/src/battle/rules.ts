// The numbers and small calculations of the battle rules. The engine, the computer opponents and the battle screen all
// read them from here, so a card shows exactly the damage the engine deals.

import { cardById } from '../cards/catalog';
import type { CharacterCard, Move, SupporterCard } from '../cards/model';
import type { BattleState, Figure, FigureRef, PlayerIndex, PlayerState } from './types';

/** Cards in the first hand. */
export const START_HAND = 5;
/** How many Characters can wait on the Bench. */
export const BENCH_SIZE = 3;
/** The first player to collect this many Memories wins. */
export const MEMORIES_TO_WIN = 6;
/** A weak defender takes this many times the damage. */
export const WEAKNESS_FACTOR = 2;
/** A resistant defender takes this much less damage. */
export const RESISTANCE_REDUCTION = 30;
/** After this many turns (of both players together) the battle is decided on Memories. */
export const TURN_LIMIT = 80;
/** A hand without a Basic Character is shown and drawn again. This many times at most, then a Basic is dealt. */
export const MAX_MULLIGANS = 20;
/** The coin is fair. */
export const HEADS_CHANCE = 0.5;
/** Hearts a player may give for free in a turn. The Hearts of a move are used up when it is made, so they are given again every turn. */
export const FREE_HEARTS_PER_TURN = 2;
/** The player who goes first cannot attack in their first turn, so they get no free Hearts in it ... */
export const FIRST_PLAYER_START_HEARTS = 0;
/** ... and the player who goes second gets one more than usual in their first turn. Together this evens out the advantage of going first. */
export const SECOND_PLAYER_START_HEARTS = 3;

export function other(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

/** How many free Hearts `player` gets in their `turnNumber`-th turn (1 for the first). */
function freeHeartsInTurn(first: PlayerIndex, player: PlayerIndex, turnNumber: number): number {
  if (turnNumber > 1) {
    return FREE_HEARTS_PER_TURN;
  }
  return player === first ? FIRST_PLAYER_START_HEARTS : SECOND_PLAYER_START_HEARTS;
}

/** How many free Hearts `player` may give during the turn that is being played. */
export function freeHearts(state: Pick<BattleState, 'first' | 'players'>, player: PlayerIndex): number {
  return freeHeartsInTurn(state.first, player, state.players[player].turnsTaken);
}

/** How many free Hearts `player` will get in their next turn. */
export function freeHeartsNext(state: Pick<BattleState, 'first' | 'players'>, player: PlayerIndex): number {
  return freeHeartsInTurn(state.first, player, state.players[player].turnsTaken + 1);
}

export function characterOf(cardId: string): CharacterCard | undefined {
  const card = cardById(cardId);
  return card?.kind === 'character' ? card : undefined;
}

export function supporterOf(cardId: string): SupporterCard | undefined {
  const card = cardById(cardId);
  return card?.kind === 'supporter' ? card : undefined;
}

/** The card on top of a Character's pile, the one that counts. */
export function topCard(figure: Figure): CharacterCard {
  const id = figure.stack[figure.stack.length - 1];
  const card = id === undefined ? undefined : characterOf(id);
  if (card === undefined) {
    throw new Error(`Character ${figure.uid} has no Character card on top of its pile.`);
  }
  return card;
}

export function maxHp(figure: Figure): number {
  return topCard(figure).hp;
}

export function currentHp(figure: Figure): number {
  return Math.max(0, maxHp(figure) - figure.damage);
}

export function isKnockedOut(figure: Figure): boolean {
  return figure.damage >= maxHp(figure);
}

/** Active first, then the Bench from the front. */
export function figureRefs(player: PlayerState): FigureRef[] {
  const refs: FigureRef[] = player.active === null ? [] : [{ zone: 'active' }];
  player.bench.forEach((_, index) => refs.push({ zone: 'bench', index }));
  return refs;
}

export function figureAt(player: PlayerState, ref: FigureRef): Figure | undefined {
  return ref.zone === 'active' ? (player.active ?? undefined) : player.bench[ref.index];
}

export function figuresOf(player: PlayerState): Figure[] {
  return player.active === null ? [...player.bench] : [player.active, ...player.bench];
}

export function findFigure(player: PlayerState, uid: number | null): Figure | undefined {
  return uid === null ? undefined : figuresOf(player).find((figure) => figure.uid === uid);
}

// --- Moves and Hearts ----------------------------------------------------------------------------------------------

/** How many grey Hearts the Bench lets the Active Character of this player leave out (Yotsuba's "Ribbon of Support"). */
export function studyDiscount(player: PlayerState): number {
  let discount = 0;
  for (const figure of player.bench) {
    const ability = topCard(figure).ability;
    if (ability?.timing !== 'passive') {
      continue;
    }
    for (const effect of ability.effects) {
      if (effect.type === 'reduceStudyCost') {
        discount += effect.amount;
      }
    }
  }
  return discount;
}

/** How many Hearts a move needs, and uses up: they are taken off the Character that attacks. A Heart always has the kind of its Character, so only the number counts. */
export function moveHeartCost(move: Move, discount: number): number {
  const grey = move.cost.filter((heart) => heart === 'study').length;
  return move.cost.length - Math.min(discount, grey);
}

export function canPayMove(figure: Figure, move: Move, discount: number): boolean {
  return figure.hearts >= moveHeartCost(move, discount);
}

/** Hearts paid when this Character retreats. */
export function retreatCost(figure: Figure): number {
  return topCard(figure).retreat;
}

// --- Damage -----------------------------------------------------------------------------------------------------------

/** What a move does before weakness, resistance and protection: its printed damage plus what the board adds. */
export function baseDamage(move: Move, attacker: Figure, owner: PlayerState): number {
  let bonus = 0;
  for (const effect of move.effects) {
    if (effect.type === 'damagePerHeart') {
      bonus += effect.amount * attacker.hearts;
    } else if (effect.type === 'damagePerCount') {
      bonus += effect.amount * (effect.count === 'ownBenched' ? owner.bench.length : figuresOf(owner).length);
    }
  }
  // "30×" moves print the amount for each count; "70+" moves print the damage they do at least.
  return move.damageSuffix === '×' ? bonus : (move.damage ?? 0) + bonus;
}

export interface DamageResult {
  /** The damage that is really dealt. */
  readonly damage: number;
  readonly doubled: boolean;
  readonly resisted: boolean;
  /** An ability of the defender took some off. */
  readonly reduced: boolean;
  /** A shield took all of it. */
  readonly blocked: boolean;
}

/** How much damage the defender takes: weakness, then resistance, then its own protection, then a shield. */
export function damageAgainst(base: number, attacker: CharacterCard, defender: Figure, shielded: boolean): DamageResult {
  if (base <= 0) {
    return { damage: 0, doubled: false, resisted: false, reduced: false, blocked: false };
  }
  const card = topCard(defender);
  let damage = base;
  const doubled = card.weakness === attacker.affinity;
  if (doubled) {
    damage *= WEAKNESS_FACTOR;
  }
  const resisted = card.resistance === attacker.affinity;
  if (resisted) {
    damage = Math.max(0, damage - RESISTANCE_REDUCTION);
  }
  let reduced = false;
  if (card.ability?.timing === 'passive') {
    for (const effect of card.ability.effects) {
      if (effect.type === 'reduceDamageTaken') {
        damage = Math.max(0, damage - effect.amount);
        reduced = true;
      }
    }
  }
  const blocked = shielded && damage > 0;
  return { damage: blocked ? 0 : damage, doubled, resisted, reduced, blocked };
}

/** The HP a Character that would be knocked out keeps with a lucky coin ("Third Time's the Charm"), or null. */
export function survivalHp(figure: Figure): number | null {
  const ability = topCard(figure).ability;
  if (ability?.timing !== 'passive') {
    return null;
  }
  for (const effect of ability.effects) {
    if (effect.type === 'coinSurvive') {
      return effect.hp;
    }
  }
  return null;
}

/** Memories the opponent gets when this Character is knocked out. */
export function memoriesFor(figure: Figure): number {
  return topCard(figure).prime ? 2 : 1;
}
