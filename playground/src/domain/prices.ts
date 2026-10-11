// What cards cost and what they are worth. All the numbers of the shop are in this one table, so the economy can be
// tuned in one place (docs/packs-und-wirtschaft.md explains why they are what they are).

import { FINISH_TIER, type FinishId, type FinishTier } from '../cards/finish';
import type { Card, Rarity } from '../cards/model';

/** What the Kiosk sells, by rarity. Art Rare and better only come from packs. Always the plain print. */
export const KIOSK_YEN: Readonly<Partial<Record<Rarity, number>>> = { C: 30, U: 80, R: 250, RR: 800 };

/** What the Kiosk pays for a plain copy of each rarity (only spare copies can be sold). */
export const SELL_YEN: Readonly<Record<Rarity, number>> = { C: 3, U: 8, R: 25, RR: 70, AR: 120, SAR: 250, UR: 600 };

/** A fancier finish is worth more: foil 1.6 times, premium 3 times. */
export const FINISH_MULTIPLIER: Readonly<Record<FinishTier, number>> = { plain: 1, foil: 1.6, premium: 3 };

/** The price the Kiosk pays for one copy. */
export function sellPrice(rarity: Rarity, finish: FinishId): number {
  return Math.max(1, Math.round(SELL_YEN[rarity] * FINISH_MULTIPLIER[FINISH_TIER[finish]]));
}

/** The price of a card in the Kiosk, or null when the Kiosk does not sell it (too rare, or only in a banner). */
export function kioskPrice(card: Card): number | null {
  if (card.kind === 'character' && card.limited !== undefined) {
    return null;
  }
  return KIOSK_YEN[card.rarity] ?? null;
}
