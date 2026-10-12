// The Kiosk: eight single cards on offer every day (plain print, Common to Double Rare), the same ones for the whole
// day and for every player's clock. Each offer can be bought twice a day. Better cards and the Halloween cards only come
// from packs, so the Kiosk helps to finish a set but never replaces the grind.

import { CATALOG, cardById } from '../cards/catalog';
import type { Card, Rarity } from '../cards/model';
import type { DayKey } from './calendar';
import type { OwnedCard } from './ownership';
import { kioskPrice } from './prices';
import { createRng } from './random';
import { addOwnedCard, spendYen, type SaveGame } from './save';

/** How many offers of each rarity are on the shelf every day. */
export const OFFERS_PER_RARITY: Readonly<Partial<Record<Rarity, number>>> = { C: 3, U: 2, R: 2, RR: 1 };
/** How often one offer can be bought in a day. */
export const OFFER_STOCK = 2;

export interface Offer {
  readonly card: Card;
  readonly price: number;
}

/** Today's offers, cheapest rarity first. The same day always gives the same shelf. */
export function dailyOffers(day: DayKey): Offer[] {
  const rng = createRng(`kiosk:${day}`);
  const offers: Offer[] = [];
  for (const [rarity, count] of Object.entries(OFFERS_PER_RARITY) as [Rarity, number][]) {
    const pool = CATALOG.filter((card) => card.rarity === rarity && kioskPrice(card) !== null);
    for (const card of rng.shuffle(pool).slice(0, count)) {
      offers.push({ card, price: kioskPrice(card) ?? 0 });
    }
  }
  return offers;
}

/** How many copies of an offer were bought on this day. */
export function boughtToday(save: SaveGame, day: DayKey, cardId: string): number {
  return save.shop.day === day ? (save.shop.bought[cardId] ?? 0) : 0;
}

export function stockLeft(save: SaveGame, day: DayKey, cardId: string): number {
  return Math.max(0, OFFER_STOCK - boughtToday(save, day, cardId));
}

/** The cheapest offer that can still be bought today (the first one among equals), or undefined when the shelf is empty. */
export function cheapestOffer(save: SaveGame, day: DayKey): Offer | undefined {
  return dailyOffers(day)
    .filter((offer) => stockLeft(save, day, offer.card.id) > 0)
    .sort((a, b) => a.price - b.price)[0];
}

export type ShopErrorCode = 'not-offered' | 'sold-out' | 'not-enough-yen';

export class ShopError extends Error {
  readonly code: ShopErrorCode;

  constructor(code: ShopErrorCode, message: string) {
    super(message);
    this.name = 'ShopError';
    this.code = code;
  }
}

export interface Purchase {
  readonly save: SaveGame;
  readonly owned: OwnedCard;
  readonly price: number;
}

/** Buys one copy of an offer of the day. Throws a ShopError when it is not on the shelf, sold out, or too expensive. */
export function buyOffer(save: SaveGame, cardId: string, day: DayKey, now: number): Purchase {
  const offer = dailyOffers(day).find((candidate) => candidate.card.id === cardId);
  if (offer === undefined) {
    throw new ShopError('not-offered', `${cardById(cardId)?.name.en ?? cardId} is not on the shelf today.`);
  }
  if (stockLeft(save, day, cardId) === 0) {
    throw new ShopError('sold-out', 'Sold out for today.');
  }
  if (save.player.yen < offer.price) {
    throw new ShopError('not-enough-yen', `It costs ${offer.price} yen, the purse holds ${save.player.yen}.`);
  }
  const paid = spendYen(save, offer.price, now);
  const added = addOwnedCard(paid, cardId, 'standard', 'shop', now);
  const bought = { ...(save.shop.day === day ? save.shop.bought : {}), [cardId]: boughtToday(save, day, cardId) + 1 };
  return { save: { ...added.save, shop: { day, bought } }, owned: added.owned, price: offer.price };
}
