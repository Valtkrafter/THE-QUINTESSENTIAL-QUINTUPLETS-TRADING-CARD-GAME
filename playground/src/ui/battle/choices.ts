// The decks a player can take into a battle: the loaner decks, then the player's own. Pure, so the lobby and the tests share it.

import { STARTER_DECKS } from '../../battle/roster';
import { cardById } from '../../cards/catalog';
import { deckProblems } from '../../domain/deckList';
import type { DeckProblem } from '../../domain/decks';
import type { SaveGame } from '../../domain/save';
import { text } from '../text';

export interface DeckChoice {
  /** `starter:<id>` for a loaner deck, `own:<id>` for one of the player's decks. */
  readonly key: string;
  readonly name: string;
  readonly cards: readonly string[];
  readonly loaner: boolean;
  /** What keeps the deck out of battle; empty when it is ready. */
  readonly problems: readonly DeckProblem[];
}

export function deckChoices(save: SaveGame): DeckChoice[] {
  const own = save.decks.map((deck): DeckChoice => ({ key: `own:${deck.id}`, name: deck.name, cards: deck.cards, loaner: false, problems: deckProblems(save, deck) }));
  const loaners = STARTER_DECKS.map((deck): DeckChoice => ({ key: `starter:${deck.id}`, name: deck.name, cards: deck.cards, loaner: true, problems: [] }));
  return [...own, ...loaners];
}

function nameOf(cardId: string): string {
  const card = cardById(cardId);
  return card === undefined ? cardId : `${card.name.en} (${card.title})`;
}

/** One problem of a deck as a sentence for the player. */
export function describeProblem(problem: DeckProblem): string {
  const messages = text.decks.problems;
  switch (problem.code) {
    case 'size':
      return messages.size(problem);
    case 'unknown-card':
      return messages['unknown-card']();
    case 'copies':
      return messages.copies(problem, nameOf(problem.cardId));
    case 'prime':
      return messages.prime(problem);
    case 'basics':
      return messages.basics();
    case 'not-owned':
      return messages['not-owned'](problem, nameOf(problem.cardId));
  }
}
