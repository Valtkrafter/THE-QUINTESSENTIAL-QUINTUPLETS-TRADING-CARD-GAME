// Gifts of the introduction: when a step needs something the player does not have (money for a pack, a card to send to Grading),
// the introduction gives exactly that, so nobody gets stuck. Pure code; the screens decide when to give.

import { CATALOG } from '../cards/catalog';
import { addOwnedCard, earnYen, type SaveGame } from './save';

export type Gift = { readonly kind: 'yen'; readonly amount: number } | { readonly kind: 'card'; readonly cardId: string };

/** A plain Common to give: the first one of the set. */
export function giftCardId(): string {
  const common = CATALOG.find((card) => card.rarity === 'C');
  if (common === undefined) {
    throw new Error('The set has no Common card to give.');
  }
  return common.id;
}

/** The save after the gift. A gift card is an ordinary copy (plain finish, a condition rolled like any other). */
export function applyGift(save: SaveGame, gift: Gift, now: number): SaveGame {
  return gift.kind === 'yen' ? earnYen(save, gift.amount, now) : addOwnedCard(save, gift.cardId, 'standard', 'reward', now).save;
}

/** The yen the player lacks for `price`, as a gift; nothing when the money is enough. */
export function yenGiftFor(save: SaveGame, price: number): readonly Gift[] {
  const missing = price - save.player.yen;
  return missing > 0 ? [{ kind: 'yen', amount: missing }] : [];
}
