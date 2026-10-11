// Decks: which cards a player may take into a battle. Pure rules, no screens: the deck builder shows the problems this
// returns, the save game stores the decks, the battle engine refuses a deck that is not legal.

import { z } from 'zod';
import { cardById } from '../cards/catalog';
import type { Card } from '../cards/model';

/** A battle deck has exactly this many cards. */
export const DECK_SIZE = 30;
/** At most this many copies of one card design. */
export const MAX_COPIES = 2;
/** At most this many Prime cards (they give 2 Memories away when knocked out, so they are limited). */
export const MAX_PRIME = 6;
/** At least this many cards that can be played straight from the hand (Basic and Event characters). */
export const MIN_BASICS = 1;
/** How many decks the save game can keep. */
export const MAX_DECKS = 8;
export const DECK_NAME_LENGTH = 32;

export const deckSchema = z.strictObject({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(DECK_NAME_LENGTH),
  /** Card ids, one entry per copy, in any order. */
  cards: z.array(z.string()).max(DECK_SIZE),
});
export type Deck = z.infer<typeof deckSchema>;

/** A character that can be played straight from the hand (not an upgrade of another card). */
export function isBasicPlayable(card: Card): boolean {
  return card.kind === 'character' && (card.stage === 'basic' || card.stage === 'event');
}

/** How many copies of the card the deck may hold: 1 for the limited Halloween cards, else `MAX_COPIES`. */
export function copyLimit(card: Card): number {
  return card.kind === 'character' && card.limited !== undefined ? card.limited.maxPerDeck : MAX_COPIES;
}

export type DeckProblem =
  | { readonly code: 'size'; readonly have: number; readonly want: number }
  | { readonly code: 'unknown-card'; readonly cardId: string }
  | { readonly code: 'copies'; readonly cardId: string; readonly have: number; readonly max: number }
  | { readonly code: 'prime'; readonly have: number; readonly max: number }
  | { readonly code: 'basics'; readonly have: number; readonly min: number }
  | { readonly code: 'not-owned'; readonly cardId: string; readonly have: number; readonly need: number };

/** How many copies of each design a collection holds. */
export function ownedCounts(collection: readonly { readonly cardId: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const copy of collection) {
    counts.set(copy.cardId, (counts.get(copy.cardId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Everything that is wrong with a deck (an empty list means it is legal). With `owned` the deck may only use cards the
 * player has, as many times as the player has them; without it (the loaner decks and the opponents' decks) it may not.
 */
export function checkDeck(cardIds: readonly string[], owned?: ReadonlyMap<string, number>): DeckProblem[] {
  const problems: DeckProblem[] = [];
  if (cardIds.length !== DECK_SIZE) {
    problems.push({ code: 'size', have: cardIds.length, want: DECK_SIZE });
  }
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let primes = 0;
  let basics = 0;
  for (const [id, have] of counts) {
    const card = cardById(id);
    if (card === undefined) {
      problems.push({ code: 'unknown-card', cardId: id });
      continue;
    }
    const max = copyLimit(card);
    if (have > max) {
      problems.push({ code: 'copies', cardId: id, have, max });
    }
    if (card.kind === 'character' && card.prime) {
      primes += have;
    }
    if (isBasicPlayable(card)) {
      basics += have;
    }
    if (owned !== undefined) {
      const own = owned.get(id) ?? 0;
      if (have > own) {
        problems.push({ code: 'not-owned', cardId: id, have: own, need: have });
      }
    }
  }
  if (primes > MAX_PRIME) {
    problems.push({ code: 'prime', have: primes, max: MAX_PRIME });
  }
  if (basics < MIN_BASICS) {
    problems.push({ code: 'basics', have: basics, min: MIN_BASICS });
  }
  return problems;
}

export function isLegalDeck(cardIds: readonly string[], owned?: ReadonlyMap<string, number>): boolean {
  return checkDeck(cardIds, owned).length === 0;
}
