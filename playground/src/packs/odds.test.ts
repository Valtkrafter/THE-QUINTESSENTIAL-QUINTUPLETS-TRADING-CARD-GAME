import { describe, expect, it } from 'vitest';
import type { Rarity } from '../cards/model';
import { createRng } from '../domain/random';
import { PACKS, packById } from './catalog';
import { bannerOdds, finishOdds, guaranteesOf, oneIn, orBetter, packsForShare, rarityOdds, shareAfter, withGuarantee } from './odds';
import { FRESH_STATE, rollPack, type PackState } from './rollPack';
import type { PackDefinition } from './schema';

const TODAY = '2026-10-12';
const NONE: ReadonlySet<string> = new Set();

function pack(id: string): PackDefinition {
  const found = packById(id);
  if (found === undefined) {
    throw new Error(`Missing pack ${id}`);
  }
  return found;
}

describe('the odds of a pack', () => {
  it('adds up: the average number of cards per pack is five', () => {
    for (const definition of PACKS) {
      const odds = rarityOdds(definition);
      const cards = (Object.keys(odds) as Rarity[]).reduce((sum, rarity) => sum + odds[rarity].average, 0);
      // The Halloween pack counts the banner card as a normal slot in these odds, so it is the five slots less the banner's share.
      const bannerShare = definition.banner?.hit.base ?? 0;
      expect(cards).toBeCloseTo(5 - bannerShare, 10);
    }
  });

  it('reads the chances of a pack straight from its slot tables', () => {
    const booster = pack('booster');
    const ur = rarityOdds(booster).UR.chance;
    // Only the hit slot can hold an Ultra Rare: its table says 0.5 %.
    expect(ur).toBeCloseTo((booster.slots[4]?.table.UR ?? 0) / 100, 10);
    expect(orBetter(booster, 'C')).toBe(1);
    expect(orBetter(booster, 'UR')).toBeCloseTo(ur, 10);
    expect(orBetter(booster, 'AR')).toBeGreaterThan(orBetter(booster, 'SAR'));
    expect(orBetter(booster, 'SAR')).toBeGreaterThan(orBetter(booster, 'UR'));
  });

  it('makes the dearer packs better in every way that matters, and the cheap one the cheapest', () => {
    const [booster, select, premium] = ['booster', 'select', 'premium'].map(pack);
    if (booster === undefined || select === undefined || premium === undefined) {
      throw new Error('missing packs');
    }
    for (const rarity of ['RR', 'AR', 'SAR', 'UR'] as const) {
      expect(orBetter(select, rarity)).toBeGreaterThan(orBetter(booster, rarity));
      expect(orBetter(premium, rarity)).toBeGreaterThanOrEqual(orBetter(select, rarity));
    }
    // Premium: an Art Rare or better in every pack.
    expect(orBetter(premium, 'AR')).toBe(1);
    // Nobody should get the good cards cheaper by buying the dear pack: per yen the three packs are close, the dear ones slightly better.
    const perYen = (definition: PackDefinition, rarity: Rarity) => orBetter(definition, rarity) / definition.price;
    for (const rarity of ['SAR', 'UR'] as const) {
      expect(perYen(select, rarity) / perYen(booster, rarity)).toBeGreaterThan(0.95);
      expect(perYen(select, rarity) / perYen(booster, rarity)).toBeLessThan(1.6);
      expect(perYen(premium, rarity) / perYen(booster, rarity)).toBeGreaterThan(0.95);
      expect(perYen(premium, rarity) / perYen(booster, rarity)).toBeLessThan(1.6);
    }
  });

  it('finds the same chances as the dice (Monte Carlo, guarantees switched off)', () => {
    const rolls = 40_000;
    for (const definition of PACKS) {
      const rng = createRng(`odds-${definition.id}`);
      const found: Record<string, number> = { RR: 0, AR: 0, SAR: 0, UR: 0 };
      const today = definition.banner === undefined ? TODAY : TODAY;
      for (let i = 0; i < rolls; i += 1) {
        const { picks } = rollPack(rng, { pack: definition, today, state: FRESH_STATE, owned: NONE });
        for (const rarity of ['RR', 'AR', 'SAR', 'UR'] as const) {
          const order = ['C', 'U', 'R', 'RR', 'AR', 'SAR', 'UR'];
          if (picks.some((pick) => order.indexOf(pick.card.rarity) >= order.indexOf(rarity) && pick.reason === 'normal')) {
            found[rarity] = (found[rarity] ?? 0) + 1;
          }
        }
      }
      for (const rarity of ['RR', 'AR', 'SAR', 'UR'] as const) {
        const wanted = orBetter(definition, rarity);
        // The Halloween pack can put a banner card (a Special Art Rare) in a slot, which is not counted above.
        const share = (found[rarity] ?? 0) / rolls;
        expect(Math.abs(share - wanted), `${definition.id} ${rarity}`).toBeLessThan(0.012);
      }
    }
  });

  it('turns a chance and a guarantee into the packs it takes', () => {
    // A coin: heads 50 %, sure by the 3rd flip. P(1) = 1/2, P(2) = 1/4, P(3) = 1/4 -> 1.75 on average.
    const odds = withGuarantee(0.5, 3);
    expect(odds.average).toBeCloseTo(1.75, 10);
    expect(odds.sureAt).toBe(3);
    expect(withGuarantee(0.5, 3).nineInTen).toBe(3);
    expect(withGuarantee(0.95, 5).nineInTen).toBe(1);
    expect(withGuarantee(0, 7).average).toBe(7);
    expect(oneIn(0.25)).toBe(4);
    expect(oneIn(0)).toBe(Number.POSITIVE_INFINITY);
  });

  it.each(['booster', 'select', 'premium'])('matches the packs it really takes to the first big hit (%s)', (id) => {
    const definition = pack(id);
    const guarantees = guaranteesOf(definition);
    const rng = createRng(`first-${id}`);
    const runs = 3000;
    let sarTotal = 0;
    let urTotal = 0;
    for (let run = 0; run < runs; run += 1) {
      let state: PackState = FRESH_STATE;
      let sar: number | null = null;
      let ur: number | null = null;
      for (let opened = 1; opened <= definition.pity.ur.after && (sar === null || ur === null); opened += 1) {
        const { picks, next } = rollPack(rng, { pack: definition, today: TODAY, state, owned: NONE });
        state = next;
        if (sar === null && picks.some((pick) => pick.card.rarity === 'SAR' || pick.card.rarity === 'UR')) {
          sar = opened;
        }
        if (ur === null && picks.some((pick) => pick.card.rarity === 'UR')) {
          ur = opened;
        }
      }
      sarTotal += sar ?? definition.pity.sar.after;
      urTotal += ur ?? definition.pity.ur.after;
    }
    // The guarantee of the Special Art Rare also hands out some Ultra Rares, so the Ultra Rare comes a little earlier than the formula says.
    expect(Math.abs(sarTotal / runs / guarantees.sar.average - 1)).toBeLessThan(0.07);
    expect(urTotal / runs).toBeLessThan(guarantees.ur.average * 1.05);
    expect(urTotal / runs).toBeGreaterThan(guarantees.ur.average * 0.8);
  });

  it('keeps the price of a good card about the same in every pack: the guarantee costs about as much yen', () => {
    const cost = (definition: PackDefinition, kind: 'sar' | 'ur') => guaranteesOf(definition)[kind].average * definition.price;
    const normal = ['booster', 'select', 'premium'].map(pack);
    for (const kind of ['sar', 'ur'] as const) {
      const prices = normal.map((definition) => cost(definition, kind));
      expect(Math.max(...prices) / Math.min(...prices)).toBeLessThan(1.45);
    }
  });

  it('lists the chances of a finish, with more foil in the dearer packs', () => {
    const booster = finishOdds(pack('booster'), 'AR');
    const premium = finishOdds(pack('premium'), 'AR');
    expect(booster.plain + booster.foil + booster.premium).toBeCloseTo(1, 10);
    expect(premium.plain).toBeLessThan(booster.plain);
    expect(premium.premium).toBeGreaterThan(booster.premium);
  });
});

describe('the odds of the banner', () => {
  const banner = pack('halloween').banner;
  if (banner === undefined) {
    throw new Error('The Halloween pack has no banner.');
  }
  const odds = bannerOdds(banner);

  it('starts at nothing, never goes down and is sure when the hard guarantee is reached', () => {
    expect(odds.any[0]).toBe(0);
    expect(odds.featured[0]).toBe(0);
    for (let n = 1; n < odds.any.length; n += 1) {
      expect(odds.any[n]).toBeGreaterThanOrEqual(odds.any[n - 1] ?? 0);
      expect(odds.featured[n]).toBeGreaterThanOrEqual(odds.featured[n - 1] ?? 0);
      expect(odds.featured[n]).toBeLessThanOrEqual((odds.any[n] ?? 0) + 1e-12);
    }
    expect(odds.any[banner.hit.hard]).toBeCloseTo(1, 10);
    expect(shareAfter(odds, banner.hit.hard + 50, 'any')).toBeCloseTo(1, 10);
  });

  it('gives the base chance for the first pack', () => {
    expect(odds.any[1]).toBeCloseTo(banner.hit.base, 10);
    expect(odds.base).toBe(banner.hit.base);
  });

  it('needs more packs for a featured card than for any banner card, but at most twice as many on average', () => {
    expect(odds.averageFeatured).toBeGreaterThan(odds.averagePacks);
    expect(odds.averageFeatured).toBeLessThan(odds.averagePacks * 2);
    // With a 50/50: one banner card, and half of the players need a second one. About 1.5 times as many.
    expect(odds.averageFeatured / odds.averagePacks).toBeGreaterThan(1.4);
    expect(odds.averageFeatured / odds.averagePacks).toBeLessThan(1.6);
  });

  it('tells how many packs half and nine in ten players need', () => {
    expect(packsForShare(odds, 'any', 0.5)).toBeLessThan(packsForShare(odds, 'any', 0.9));
    expect(packsForShare(odds, 'any', 0.9)).toBeLessThanOrEqual(banner.hit.hard);
    expect(packsForShare(odds, 'featured', 0.5)).toBeGreaterThanOrEqual(packsForShare(odds, 'any', 0.5));
  });

  it('agrees with the dice: the average number of packs to the first banner card and to a featured card', () => {
    const definition = pack('halloween');
    const rng = createRng('banner-dice');
    const runs = 4000;
    let anyTotal = 0;
    let featuredTotal = 0;
    for (let run = 0; run < runs; run += 1) {
      let state: PackState = FRESH_STATE;
      let anyAt: number | null = null;
      let featuredAt: number | null = null;
      for (let opened = 1; featuredAt === null && opened < 400; opened += 1) {
        const { picks, next } = rollPack(rng, { pack: definition, today: TODAY, state, owned: NONE });
        state = next;
        anyAt ??= picks.some((pick) => pick.reason === 'banner-main' || pick.reason === 'banner-side') ? opened : null;
        featuredAt = picks.some((pick) => pick.reason === 'banner-main') ? opened : null;
      }
      anyTotal += anyAt ?? 0;
      featuredTotal += featuredAt ?? 0;
    }
    expect(Math.abs(anyTotal / runs / odds.averagePacks - 1)).toBeLessThan(0.05);
    expect(Math.abs(featuredTotal / runs / odds.averageFeatured - 1)).toBeLessThan(0.06);
  });
});
