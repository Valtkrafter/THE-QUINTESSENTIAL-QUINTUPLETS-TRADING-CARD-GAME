// The player's list of decks inside the save game: add, change and remove them. Pure code; the screens call these through
// the game store. A deck may be saved unfinished (fewer than 30 cards); `deckProblems` says what still has to be fixed
// before it can be taken into a battle.

import type { SaveGame } from './save';
import { DECK_NAME_LENGTH, DECK_SIZE, MAX_DECKS, checkDeck, deckSchema, ownedCounts, type Deck, type DeckProblem } from './decks';

/** An id that no deck of the save has yet ("deck-1", "deck-2", ...). */
export function nextDeckId(decks: readonly Deck[]): string {
  const used = new Set(decks.map((deck) => deck.id));
  let number = 1;
  while (used.has(`deck-${number}`)) {
    number += 1;
  }
  return `deck-${number}`;
}

export function deckById(save: SaveGame, id: string): Deck | undefined {
  return save.decks.find((deck) => deck.id === id);
}

/** Adds the deck, or replaces the deck with the same id. Returns a new save; throws when the deck or the list is not allowed. */
export function saveDeck(save: SaveGame, deck: Deck, now: number): SaveGame {
  const checked = deckSchema.safeParse(deck);
  if (!checked.success) {
    throw new Error(`This deck cannot be saved: it needs a name of up to ${DECK_NAME_LENGTH} letters and at most ${DECK_SIZE} cards.`);
  }
  const exists = save.decks.some((candidate) => candidate.id === deck.id);
  if (!exists && save.decks.length >= MAX_DECKS) {
    throw new Error(`You can keep at most ${MAX_DECKS} decks.`);
  }
  const stored: Deck = { ...checked.data, cards: [...checked.data.cards] };
  const decks = exists ? save.decks.map((candidate) => (candidate.id === deck.id ? stored : candidate)) : [...save.decks, stored];
  return { ...save, updatedAt: now, decks };
}

export function deleteDeck(save: SaveGame, id: string, now: number): SaveGame {
  return { ...save, updatedAt: now, decks: save.decks.filter((deck) => deck.id !== id) };
}

/** What is wrong with a deck of the player: the rules of a deck, and cards the player does not own (enough of). */
export function deckProblems(save: SaveGame, deck: Deck): DeckProblem[] {
  return checkDeck(deck.cards, ownedCounts(save.collection));
}
