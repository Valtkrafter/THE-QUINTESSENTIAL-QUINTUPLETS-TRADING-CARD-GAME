import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { CHARACTER_BONUS_YEN, DEX_PACK_EVERY, claimDexRewards, pendingDexRewards } from './dexRewards';
import { saveDeck } from './deckList';
import { OFFERS_PER_RARITY, OFFER_STOCK, ShopError, buyOffer, cheapestOffer, dailyOffers, stockLeft } from './kiosk';
import { FINISH_MULTIPLIER, KIOSK_YEN, SELL_YEN, kioskPrice, sellPrice } from './prices';
import { STARTING_YEN, addOwnedCard, newSaveGame, withShowcase, type SaveGame } from './save';
import { sellCopies, sellableCopies } from './selling';

const NOW = 1_760_000_000_000;
const DAY = '2026-10-12';

function withCards(...cards: readonly (readonly [string, Parameters<typeof addOwnedCard>[2]])[]): SaveGame {
  let save = newSaveGame('shop', NOW);
  for (const [cardId, finish] of cards) {
    save = addOwnedCard(save, cardId, finish, 'pack', NOW).save;
  }
  return save;
}

describe('prices', () => {
  it('pay more for rarer cards and fancier finishes', () => {
    expect(sellPrice('C', 'standard')).toBe(SELL_YEN.C);
    expect(sellPrice('C', 'rainbow')).toBe(Math.round(SELL_YEN.C * FINISH_MULTIPLIER.foil));
    expect(sellPrice('UR', 'gold')).toBe(SELL_YEN.UR * FINISH_MULTIPLIER.premium);
    for (const finish of ['standard', 'rainbow', 'cosmos'] as const) {
      expect(sellPrice('R', finish)).toBeLessThan(sellPrice('RR', finish));
    }
  });

  it('never let selling a whole pack pay more than the pack costs', () => {
    // The best a pack can do: a Special Art Rare and an Ultra Rare in premium finish, plus three Double Rares.
    const best = sellPrice('UR', 'gold') + sellPrice('SAR', 'gold') + 3 * sellPrice('RR', 'gold');
    expect(best).toBeGreaterThan(500);
    // A typical pack (3 Common, 1 Uncommon, 1 Rare, plain) pays a small part of its price.
    expect(3 * SELL_YEN.C + SELL_YEN.U + SELL_YEN.R).toBeLessThan(100);
  });

  it('sell in the Kiosk only the plain print of Common to Double Rare cards, never a limited card', () => {
    for (const card of CATALOG) {
      const price = kioskPrice(card);
      const limited = card.kind === 'character' && card.limited !== undefined;
      if (limited || ['AR', 'SAR', 'UR'].includes(card.rarity)) {
        expect(price).toBeNull();
      } else {
        expect(price).toBe(KIOSK_YEN[card.rarity]);
      }
    }
  });
});

describe('selling spare copies', () => {
  it('keeps one copy of every design and offers only the others, cheapest first', () => {
    const save = withCards(['TQQ01-001', 'standard'], ['TQQ01-001', 'gold'], ['TQQ01-001', 'standard'], ['TQQ01-002', 'standard']);
    const options = sellableCopies(save);
    // Three copies of 001: the gold one is kept, two plain ones are spare. The single 002 stays.
    expect(options).toHaveLength(2);
    expect(options.every((option) => option.copy.cardId === 'TQQ01-001' && option.copy.finish === 'standard')).toBe(true);
    expect(options[0]?.price).toBe(SELL_YEN.C);
  });

  it('keeps the copies a deck needs and the copies on display', () => {
    let save = withCards(['TQQ01-001', 'standard'], ['TQQ01-001', 'standard'], ['TQQ01-001', 'standard'], ['TQQ01-001', 'standard']);
    expect(sellableCopies(save)).toHaveLength(3);
    save = saveDeck(save, { id: 'deck-1', name: 'D', cards: ['TQQ01-001', 'TQQ01-001'] }, NOW);
    expect(sellableCopies(save)).toHaveLength(2);
    save = withShowcase(save, [save.collection[3]?.uid ?? ''], NOW);
    // One copy is on display (it counts as one of the two the deck needs), so 4 - 2 are spare... the display copy stays too.
    expect(sellableCopies(save)).toHaveLength(2);
    expect(sellableCopies(save).some((option) => save.showcase.includes(option.copy.uid))).toBe(false);
  });

  it('sells what is chosen, pays for it and refuses a copy that must stay', () => {
    const save = withCards(['TQQ01-001', 'standard'], ['TQQ01-001', 'standard'], ['TQQ01-025', 'sparkle'], ['TQQ01-025', 'standard']);
    const options = sellableCopies(save);
    const first = options[0];
    expect(first).toBeDefined();
    const sale = sellCopies(save, options.map((option) => option.copy.uid), NOW + 1);
    expect(sale.sold).toBe(2);
    expect(sale.yen).toBe(options.reduce((sum, option) => sum + option.price, 0));
    expect(sale.save.player.yen).toBe(STARTING_YEN + sale.yen);
    expect(sale.save.collection).toHaveLength(2);
    expect(save.collection).toHaveLength(4);
    const kept = save.collection.find((copy) => !options.some((option) => option.copy.uid === copy.uid));
    expect(() => sellCopies(save, [kept?.uid ?? ''], NOW)).toThrow(/cannot be sold/);
    expect(() => sellCopies(save, ['c999999'], NOW)).toThrow(/cannot be sold/);
  });
});

describe('the Kiosk', () => {
  it('puts the same eight cards on the shelf all day, different ones another day', () => {
    const today = dailyOffers(DAY);
    expect(today).toHaveLength(Object.values(OFFERS_PER_RARITY).reduce((sum, count) => sum + count, 0));
    expect(dailyOffers(DAY).map((offer) => offer.card.id)).toEqual(today.map((offer) => offer.card.id));
    expect(dailyOffers('2026-10-13').map((offer) => offer.card.id)).not.toEqual(today.map((offer) => offer.card.id));
    expect(new Set(today.map((offer) => offer.card.id)).size).toBe(today.length);
    expect(today.every((offer) => offer.price === kioskPrice(offer.card))).toBe(true);
  });

  it('sells a plain copy for the price on the shelf, twice a day at most', () => {
    const offer = dailyOffers(DAY)[0];
    if (offer === undefined) {
      throw new Error('no offer');
    }
    let save = newSaveGame('kiosk', NOW);
    save = { ...save, player: { yen: 5000 } };
    const first = buyOffer(save, offer.card.id, DAY, NOW + 1);
    expect(first.owned.finish).toBe('standard');
    expect(first.owned.obtained.source).toBe('shop');
    expect(first.save.player.yen).toBe(5000 - offer.price);
    expect(stockLeft(first.save, DAY, offer.card.id)).toBe(OFFER_STOCK - 1);
    const second = buyOffer(first.save, offer.card.id, DAY, NOW + 2);
    expect(stockLeft(second.save, DAY, offer.card.id)).toBe(0);
    expect(() => buyOffer(second.save, offer.card.id, DAY, NOW + 3)).toThrow(ShopError);
    // The next day the shelf is stocked again.
    expect(stockLeft(second.save, '2026-10-13', offer.card.id)).toBe(OFFER_STOCK);
  });

  it('knows the cheapest card that can still be bought', () => {
    let save = { ...newSaveGame('cheap', NOW), player: { yen: 50_000 } };
    const prices = dailyOffers(DAY).map((offer) => offer.price);
    const first = cheapestOffer(save, DAY);
    expect(first?.price).toBe(Math.min(...prices));
    // When the cheapest one is bought out, the next one is the cheapest.
    for (let bought = 0; bought < OFFER_STOCK; bought += 1) {
      save = buyOffer(save, first?.card.id ?? '', DAY, NOW + bought).save;
    }
    const second = cheapestOffer(save, DAY);
    expect(second?.card.id).not.toBe(first?.card.id);
    expect(second && stockLeft(save, DAY, second.card.id)).toBeGreaterThan(0);
    // Another day, a full shelf again.
    expect(cheapestOffer(save, '2026-10-13')).toBeDefined();
  });

  it('refuses a card that is not on the shelf and a purse that is too empty', () => {
    const offer = dailyOffers(DAY).at(-1);
    if (offer === undefined) {
      throw new Error('no offer');
    }
    const poor = { ...newSaveGame('poor', NOW), player: { yen: offer.price - 1 } };
    expect(() => buyOffer(poor, offer.card.id, DAY, NOW)).toThrow(/costs/);
    const notThere = CATALOG.find((card) => !dailyOffers(DAY).some((candidate) => candidate.card.id === card.id));
    expect(() => buyOffer(newSaveGame('x', NOW), notThere?.id ?? '', DAY, NOW)).toThrow(/not on the shelf/);
    try {
      buyOffer(poor, offer.card.id, DAY, NOW);
    } catch (error) {
      expect(error instanceof ShopError && error.code).toBe('not-enough-yen');
    }
  });
});

describe('Card-Dex rewards', () => {
  const cards = CATALOG.map((card) => [card.id, 'standard'] as const);

  it('give a free pack for every 10 designs found, once', () => {
    const nine = withCards(...cards.slice(0, DEX_PACK_EVERY - 1));
    expect(pendingDexRewards(nine).packs).toBe(0);
    const twenty = withCards(...cards.slice(0, DEX_PACK_EVERY * 2));
    expect(pendingDexRewards(twenty).packs).toBe(2);
    const claimed = claimDexRewards(twenty, NOW + 1);
    expect(claimed.save.dexRewards).toMatchObject({ milestones: 2, freePacks: 2 });
    expect(pendingDexRewards(claimed.save).packs).toBe(0);
    expect(claimDexRewards(claimed.save, NOW + 2).save).toBe(claimed.save);
  });

  it('pay a bonus for a whole character, once', () => {
    const ichika = CATALOG.filter((card) => card.character === 'ichika').map((card) => [card.id, 'standard'] as const);
    const save = withCards(...ichika);
    const pending = pendingDexRewards(save);
    expect(pending.characters).toEqual(['ichika']);
    expect(pending.yen).toBe(CHARACTER_BONUS_YEN);
    const claimed = claimDexRewards(save, NOW + 1);
    expect(claimed.save.player.yen).toBe(STARTING_YEN + CHARACTER_BONUS_YEN);
    expect(claimed.save.dexRewards.characters).toEqual(['ichika']);
    expect(pendingDexRewards(claimed.save).characters).toEqual([]);
  });
});
