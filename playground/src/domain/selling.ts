// Selling spare copies. A copy is "spare" when the player has more of the design than they need: they always keep one,
// as many as their biggest deck uses, and every copy that is on display or graded. Nothing else can be sold, so selling can
// never break a deck or take a favourite away. Pure code: the screen only picks which spare copies to sell.

import { cardById } from '../cards/catalog';
import { finishRank } from './collection';
import type { OwnedCard } from './ownership';
import { sellPrice } from './prices';
import { earnYen, type SaveGame } from './save';

export interface SellOption {
  readonly copy: OwnedCard;
  readonly price: number;
}

/** How many copies of each design the decks use at most (a card can be in several decks at the same time). */
export function deckNeeds(save: SaveGame): Map<string, number> {
  const needs = new Map<string, number>();
  for (const deck of save.decks) {
    const counts = new Map<string, number>();
    for (const cardId of deck.cards) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }
    for (const [cardId, count] of counts) {
      needs.set(cardId, Math.max(needs.get(cardId) ?? 0, count));
    }
  }
  return needs;
}

function conditionOf(copy: OwnedCard): number {
  const { centering, corners, edges, surface } = copy.condition;
  return (centering + corners + edges + surface) / 4;
}

/** Copies that are worth keeping come first: the fanciest finish, then the best condition, then the oldest print. */
function keepFirst(a: OwnedCard, b: OwnedCard): number {
  return finishRank(b.finish) - finishRank(a.finish) || conditionOf(b) - conditionOf(a) || a.serial - b.serial;
}

/** The spare copies the player may sell, cheapest first. */
export function sellableCopies(save: SaveGame): SellOption[] {
  const needs = deckNeeds(save);
  const shown = new Set(save.showcase);
  const byDesign = new Map<string, OwnedCard[]>();
  for (const copy of save.collection) {
    byDesign.set(copy.cardId, [...(byDesign.get(copy.cardId) ?? []), copy]);
  }
  const spare: SellOption[] = [];
  for (const [cardId, copies] of byDesign) {
    const card = cardById(cardId);
    if (card === undefined) {
      continue;
    }
    const kept = copies.filter((copy) => shown.has(copy.uid) || copy.grade !== null);
    const loose = copies.filter((copy) => !shown.has(copy.uid) && copy.grade === null).sort(keepFirst);
    const stay = Math.max(1, needs.get(cardId) ?? 0) - kept.length;
    for (const copy of loose.slice(Math.max(0, stay))) {
      spare.push({ copy, price: sellPrice(card.rarity, copy.finish) });
    }
  }
  return spare.sort((a, b) => a.price - b.price || a.copy.uid.localeCompare(b.copy.uid));
}

export interface Sale {
  readonly save: SaveGame;
  readonly sold: number;
  readonly yen: number;
}

/** Sells the given copies. Throws when one of them is not spare, so a stale list on a screen can never sell a card that must stay. */
export function sellCopies(save: SaveGame, uids: readonly string[], now: number): Sale {
  const options = new Map(sellableCopies(save).map((option) => [option.copy.uid, option]));
  const wanted = new Set(uids);
  let yen = 0;
  for (const uid of wanted) {
    const option = options.get(uid);
    if (option === undefined) {
      throw new Error(`The copy ${uid} cannot be sold: it is the one the player keeps, or it is needed.`);
    }
    yen += option.price;
  }
  const remaining = save.collection.filter((copy) => !wanted.has(copy.uid));
  return { save: earnYen({ ...save, collection: remaining }, yen, now), sold: wanted.size, yen };
}
