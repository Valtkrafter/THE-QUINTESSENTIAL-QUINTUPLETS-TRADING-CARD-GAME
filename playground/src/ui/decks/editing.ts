// The rules of changing a deck card by card, for the deck builder: which cards can still be added and why not, adding and
// taking out one copy, and keeping the list in print order. Pure, so the builder only has to draw the result.

import { cardById, CATALOG } from '../../cards/catalog';
import type { Card } from '../../cards/model';
import { DECK_SIZE, MAX_PRIME, copyLimit } from '../../domain/decks';

export interface DesignRow {
  readonly card: Card;
  /** How many copies of this design the player owns. */
  readonly owned: number;
  /** How many of them are in the deck. */
  readonly inDeck: number;
}

/** The number of copies of each card in a list. */
export function countsOf(cardIds: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Every design the player owns, in print order, with how many copies are owned and how many are in the deck. */
export function designRows(owned: ReadonlyMap<string, number>, deck: readonly string[]): DesignRow[] {
  const inDeck = countsOf(deck);
  return CATALOG.filter((card) => (owned.get(card.id) ?? 0) > 0).map((card) => ({ card, owned: owned.get(card.id) ?? 0, inDeck: inDeck.get(card.id) ?? 0 }));
}

export type Blocker = 'full' | 'not-owned' | 'copies' | 'prime';

/** Why one more copy of the card cannot go into the deck, or null when it can. */
export function blockerFor(card: Card, deck: readonly string[], owned: number): Blocker | null {
  const inDeck = countsOf(deck).get(card.id) ?? 0;
  if (deck.length >= DECK_SIZE) {
    return 'full';
  }
  if (inDeck >= owned) {
    return 'not-owned';
  }
  if (inDeck >= copyLimit(card)) {
    return 'copies';
  }
  if (card.kind === 'character' && card.prime && deck.filter((id) => primeCard(id)).length >= MAX_PRIME) {
    return 'prime';
  }
  return null;
}

function primeCard(cardId: string): boolean {
  const card = cardById(cardId);
  return card?.kind === 'character' && card.prime;
}

function byPrintOrder(a: string, b: string): number {
  return (cardById(a)?.number ?? 0) - (cardById(b)?.number ?? 0);
}

/** The deck with the cards in print order, so it reads the same every time. */
export function sortDeck(deck: readonly string[]): string[] {
  return [...deck].sort(byPrintOrder);
}

export function addCopy(deck: readonly string[], cardId: string): string[] {
  return sortDeck([...deck, cardId]);
}

/** The deck without one copy of the card (the deck itself when the card is not in it). */
export function removeCopy(deck: readonly string[], cardId: string): string[] {
  const at = deck.indexOf(cardId);
  return at < 0 ? [...deck] : [...deck.slice(0, at), ...deck.slice(at + 1)];
}

/** The deck as one row per design, in print order, with the number of copies. */
export function deckRows(deck: readonly string[]): { readonly card: Card; readonly copies: number }[] {
  const rows: { card: Card; copies: number }[] = [];
  for (const [cardId, copies] of countsOf(sortDeck(deck))) {
    const card = cardById(cardId);
    if (card !== undefined) {
      rows.push({ card, copies });
    }
  }
  return rows.sort((a, b) => a.card.number - b.card.number);
}
