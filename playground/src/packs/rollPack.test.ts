import { describe, expect, it } from 'vitest';
import { cardById, CATALOG } from '../cards/catalog';
import type { Rarity } from '../cards/model';
import { FINISH_TIER } from '../cards/finish';
import { createRng } from '../domain/random';
import { eventCards, isLimited, packById } from './catalog';
import { FRESH_STATE, activePhase, bannerHitChance, isAvailable, normalPool, rollPack, type PackState } from './rollPack';
import type { PackDefinition } from './schema';

const IN_PHASE_ONE = '2026-10-12';
const IN_PHASE_TWO = '2026-10-30';

function pack(id: string): PackDefinition {
  const found = packById(id);
  if (found === undefined) {
    throw new Error(`Missing test pack ${id}`);
  }
  return found;
}

const BOOSTER = pack('booster');
const HALLOWEEN = pack('halloween');
const NONE: ReadonlySet<string> = new Set();

function roll(seed: string, definition: PackDefinition, state: PackState = FRESH_STATE, owned: ReadonlySet<string> = NONE, today = IN_PHASE_ONE) {
  return rollPack(createRng(seed), { pack: definition, today, state, owned });
}

/** Share of `rolls` packs in which `test` holds, drawn from a different seed each time. */
function share(rolls: number, test: (picks: ReturnType<typeof roll>['picks']) => boolean, definition = BOOSTER, state = FRESH_STATE, owned = NONE, today = IN_PHASE_ONE): number {
  let hits = 0;
  for (let i = 0; i < rolls; i += 1) {
    if (test(roll(`share-${i}`, definition, state, owned, today).picks)) {
      hits += 1;
    }
  }
  return hits / rolls;
}

describe('a pack', () => {
  it('has five cards, one per slot, in slot order', () => {
    const { picks } = roll('shape', BOOSTER);
    expect(picks.map((pick) => pick.slot)).toEqual([0, 1, 2, 3, 4]);
    expect(picks.map((pick) => pick.role)).toEqual(['basic', 'basic', 'basic', 'plus', 'hit']);
  });

  it('comes out the same for the same seed and differently for another', () => {
    const ids = (seed: string) => roll(seed, BOOSTER).picks.map((pick) => `${pick.card.id}/${pick.finish}`);
    expect(ids('same')).toEqual(ids('same'));
    expect(ids('same')).not.toEqual(ids('other'));
  });

  it('never contains a limited card in the normal booster', () => {
    for (let i = 0; i < 3000; i += 1) {
      for (const pick of roll(`limited-${i}`, BOOSTER).picks) {
        expect(isLimited(pick.card)).toBe(false);
      }
    }
  });

  it.each(['booster', 'select', 'premium'])('follows the published table of each slot of the %s pack (Monte Carlo)', (id) => {
    const definition = pack(id);
    const rolls = 30_000;
    const counts: Partial<Record<Rarity, number>>[] = definition.slots.map(() => ({}));
    for (let i = 0; i < rolls; i += 1) {
      for (const pick of roll(`odds-${id}-${i}`, definition).picks) {
        const row = counts[pick.slot];
        if (row !== undefined) {
          row[pick.card.rarity] = (row[pick.card.rarity] ?? 0) + 1;
        }
      }
    }
    definition.slots.forEach((slot, index) => {
      const total = Object.values(slot.table).reduce((sum, weight) => sum + weight, 0);
      for (const rarity of ['C', 'U', 'R', 'RR', 'AR', 'SAR', 'UR'] as const) {
        const wanted = ((slot.table[rarity] ?? 0) / total) * 100;
        const found = ((counts[index]?.[rarity] ?? 0) / rolls) * 100;
        // Four standard deviations of a 50 % event in 30,000 rolls is about 1.2 percentage points.
        expect(Math.abs(found - wanted), `${id} slot ${index + 1} ${rarity}`).toBeLessThan(1.3);
      }
    });
  });

  it('gives each design of a rarity the same chance', () => {
    const rolls = 40_000;
    const counts = new Map<string, number>();
    for (let i = 0; i < rolls; i += 1) {
      const hit = roll(`equal-${i}`, BOOSTER).picks[0];
      if (hit !== undefined && hit.card.rarity === 'C') {
        counts.set(hit.card.id, (counts.get(hit.card.id) ?? 0) + 1);
      }
    }
    const commons = normalPool('C');
    const expected = (rolls * ((BOOSTER.slots[0]?.table.C ?? 0) / 100)) / commons.length;
    for (const card of commons) {
      expect(Math.abs((counts.get(card.id) ?? 0) - expected) / expected).toBeLessThan(0.1);
    }
  });

  it('leaves out the weak rarities in the dearer packs', () => {
    for (const id of ['select', 'premium']) {
      for (let i = 0; i < 1500; i += 1) {
        const picks = roll(`weak-${id}-${i}`, pack(id)).picks;
        expect(picks.some((pick) => pick.card.rarity === 'C'), id).toBe(false);
      }
    }
    for (let i = 0; i < 1500; i += 1) {
      const picks = roll(`weak-premium-${i}`, pack('premium')).picks;
      expect(picks.some((pick) => pick.card.rarity === 'U')).toBe(false);
      // Every Premium pack holds an Art Rare or better.
      expect(picks.some((pick) => ['AR', 'SAR', 'UR'].includes(pick.card.rarity))).toBe(true);
    }
  });

  it('makes foil and premium finishes more common in the dearer packs', () => {
    const premiumShare = (id: string): number => {
      let premium = 0;
      let total = 0;
      for (let i = 0; i < 4000; i += 1) {
        for (const pick of roll(`finish-${id}-${i}`, pack(id)).picks) {
          total += 1;
          premium += FINISH_TIER[pick.finish] === 'plain' ? 0 : 1;
        }
      }
      return premium / total;
    };
    const booster = premiumShare('booster');
    const select = premiumShare('select');
    const premium = premiumShare('premium');
    expect(select).toBeGreaterThan(booster);
    expect(premium).toBeGreaterThan(select);
  });
});

describe('the guarantees', () => {
  const owned = new Set<string>();

  it('make the hit slot a Special Art Rare or better when the Special Art Rare guarantee is due', () => {
    const due: PackState = { ...FRESH_STATE, sar: BOOSTER.pity.sar.after - 1 };
    expect(share(1500, (picks) => picks.some((pick) => pick.card.rarity === 'SAR' || pick.card.rarity === 'UR'), BOOSTER, due, owned)).toBe(1);
  });

  it('mix Special Art Rare and Ultra Rare by the published share', () => {
    const due: PackState = { ...FRESH_STATE, sar: BOOSTER.pity.sar.after - 1 };
    let urs = 0;
    let forced = 0;
    for (let i = 0; i < 6000; i += 1) {
      const hit = roll(`mix-${i}`, BOOSTER, due).picks[4];
      if (hit?.reason === 'pity-sar') {
        forced += 1;
        urs += hit.card.rarity === 'UR' ? 1 : 0;
      }
    }
    expect(forced).toBeGreaterThan(4000);
    expect(Math.abs(urs / forced - BOOSTER.pity.sar.urShare)).toBeLessThan(0.03);
  });

  it('make the hit slot an Ultra Rare when the Ultra Rare guarantee is due', () => {
    const due: PackState = { ...FRESH_STATE, ur: BOOSTER.pity.ur.after - 1 };
    expect(share(1500, (picks) => picks[4]?.card.rarity === 'UR', BOOSTER, due, owned)).toBe(1);
  });

  it('do not fire one pack early', () => {
    const early: PackState = { ...FRESH_STATE, sar: BOOSTER.pity.sar.after - 2, ur: BOOSTER.pity.ur.after - 2 };
    const fired = share(3000, (picks) => picks.some((pick) => pick.reason === 'pity-sar' || pick.reason === 'pity-ur'), BOOSTER, early, owned);
    expect(fired).toBe(0);
  });

  it('count a naturally rolled hit as no guarantee', () => {
    const due: PackState = { ...FRESH_STATE, ur: BOOSTER.pity.ur.after - 1 };
    const reasons = new Set<string>();
    for (let i = 0; i < 4000; i += 1) {
      const hit = roll(`natural-${i}`, BOOSTER, due).picks[4];
      if (hit !== undefined) {
        reasons.add(hit.reason);
      }
    }
    // Most of the time the roll was not an Ultra Rare, so the guarantee fired; sometimes it was one by itself.
    expect(reasons).toEqual(new Set(['pity-ur', 'normal']));
  });

  it('give a design the player does not own yet (duplicate protection)', () => {
    const urs = normalPool('UR');
    const missing = urs[2];
    expect(missing).toBeDefined();
    const ownedAllButOne = new Set(urs.filter((card) => card.id !== missing?.id).map((card) => card.id));
    const due: PackState = { ...FRESH_STATE, ur: BOOSTER.pity.ur.after - 1 };
    for (let i = 0; i < 400; i += 1) {
      const pick = roll(`dup-${i}`, BOOSTER, due, ownedAllButOne).picks[4];
      if (pick?.reason === 'pity-ur') {
        expect(pick.card.id).toBe(missing?.id);
      }
    }
  });

  it.each(['booster', 'select', 'premium', 'halloween'])('fire at the published pack of the %s pack', (id) => {
    const definition = pack(id);
    const dueSar: PackState = { ...FRESH_STATE, sar: definition.pity.sar.after - 1 };
    expect(share(400, (picks) => picks.some((pick) => pick.card.rarity === 'SAR' || pick.card.rarity === 'UR'), definition, dueSar, owned)).toBe(1);
    const dueUr: PackState = { ...FRESH_STATE, ur: definition.pity.ur.after - 1 };
    expect(share(400, (picks) => picks[4]?.card.rarity === 'UR', definition, dueUr, owned)).toBe(1);
  });

  it('still work when the player owns every Ultra Rare', () => {
    const everyUr = new Set(normalPool('UR').map((card) => card.id));
    const due: PackState = { ...FRESH_STATE, ur: BOOSTER.pity.ur.after - 1 };
    expect(share(300, (picks) => picks[4]?.card.rarity === 'UR', BOOSTER, due, everyUr)).toBe(1);
  });

  it('reset the counters after a hit and count up otherwise', () => {
    const start: PackState = { ...FRESH_STATE, sar: 7, ur: 11 };
    for (let i = 0; i < 400; i += 1) {
      const { picks, next } = roll(`counters-${i}`, BOOSTER, start);
      const hasUr = picks.some((pick) => pick.card.rarity === 'UR');
      const hasSar = picks.some((pick) => pick.card.rarity === 'SAR');
      expect(next.ur).toBe(hasUr ? 0 : 12);
      expect(next.sar).toBe(hasUr || hasSar ? 0 : 8);
      expect(next.banner).toBe(start.banner);
    }
  });
});

describe('the banner', () => {
  const banner = HALLOWEEN.banner;
  if (banner === undefined) {
    throw new Error('The Halloween pack has no banner.');
  }
  const eventIds = new Set(eventCards('halloween').map((card) => card.id));
  const phaseOne = activePhase(banner, IN_PHASE_ONE);
  const phaseTwo = activePhase(banner, IN_PHASE_TWO);

  it('runs only inside its window, and switches phase on 23 October', () => {
    expect(isAvailable(BOOSTER, '2030-01-01')).toBe(true);
    expect(isAvailable(HALLOWEEN, '2026-10-09')).toBe(false);
    expect(isAvailable(HALLOWEEN, '2026-10-10')).toBe(true);
    expect(isAvailable(HALLOWEEN, '2026-11-04')).toBe(true);
    expect(isAvailable(HALLOWEEN, '2026-11-05')).toBe(false);
    expect(activePhase(banner, '2026-10-22')).toBe(phaseOne);
    expect(activePhase(banner, '2026-10-23')).toBe(phaseTwo);
    expect(phaseOne).not.toBe(phaseTwo);
    expect(() => roll('closed', HALLOWEEN, FRESH_STATE, NONE, '2026-12-01')).toThrow(/not running/);
  });

  it('keeps the base chance, rises softly, and is certain at the hard guarantee', () => {
    const { hit } = banner;
    expect(bannerHitChance(hit, 0)).toBe(hit.base);
    expect(bannerHitChance(hit, hit.softFrom - 2)).toBe(hit.base);
    expect(bannerHitChance(hit, hit.softFrom - 1)).toBeCloseTo(hit.base + hit.softStep, 10);
    expect(bannerHitChance(hit, hit.softFrom)).toBeCloseTo(hit.base + 2 * hit.softStep, 10);
    expect(bannerHitChance(hit, hit.hard - 1)).toBe(1);
    expect(bannerHitChance(hit, hit.hard + 20)).toBe(1);
    let last = 0;
    for (let n = 0; n < hit.hard; n += 1) {
      const chance = bannerHitChance(hit, n);
      expect(chance).toBeGreaterThanOrEqual(last);
      last = chance;
    }
  });

  it('puts a Halloween card in the "plus" slot every time once the hard guarantee is due', () => {
    const due: PackState = { ...FRESH_STATE, banner: banner.hit.hard - 1 };
    for (let i = 0; i < 400; i += 1) {
      const { picks, next } = roll(`hard-${i}`, HALLOWEEN, due);
      const plus = picks[3];
      expect(plus === undefined ? false : eventIds.has(plus.card.id)).toBe(true);
      expect(next.banner).toBe(0);
    }
  });

  it('gives a main card of the running phase when the 50/50 was lost before', () => {
    const sure: PackState = { ...FRESH_STATE, banner: banner.hit.hard - 1, mainSure: true };
    for (const [day, phase] of [[IN_PHASE_ONE, phaseOne], [IN_PHASE_TWO, phaseTwo]] as const) {
      for (let i = 0; i < 300; i += 1) {
        const { picks, next } = roll(`sure-${day}-${i}`, HALLOWEEN, sure, NONE, day);
        const plus = picks[3];
        expect(plus?.reason).toBe('banner-main');
        expect(phase?.mains).toContain(plus?.card.id);
        expect(next.mainSure).toBe(false);
      }
    }
  });

  it('wins the 50/50 half of the time, and a lost 50/50 makes the next one sure', () => {
    const due: PackState = { ...FRESH_STATE, banner: banner.hit.hard - 1 };
    let main = 0;
    let side = 0;
    for (let i = 0; i < 6000; i += 1) {
      const { picks, next } = roll(`fifty-${i}`, HALLOWEEN, due);
      const plus = picks[3];
      if (plus?.reason === 'banner-main') {
        main += 1;
        expect(phaseOne?.mains).toContain(plus.card.id);
        expect(next.mainSure).toBe(false);
      } else if (plus?.reason === 'banner-side') {
        side += 1;
        expect(phaseOne?.mains).not.toContain(plus.card.id);
        expect(eventIds.has(plus.card.id)).toBe(true);
        expect(next.mainSure).toBe(true);
      }
    }
    expect(main + side).toBe(6000);
    expect(Math.abs(main / 6000 - banner.mainShare)).toBeLessThan(0.025);
  });

  it('prefers an event card the player does not own yet', () => {
    const owned = new Set(eventCards('halloween').filter((card) => card.id !== 'TQQ01-024').map((card) => card.id));
    const due: PackState = { ...FRESH_STATE, banner: banner.hit.hard - 1 };
    // Only the side card TQQ01-024 is missing, so every lost 50/50 must hand it out.
    for (let i = 0; i < 400; i += 1) {
      const plus = roll(`missing-${i}`, HALLOWEEN, due, owned).picks[3];
      if (plus?.reason === 'banner-side') {
        expect(plus.card.id).toBe('TQQ01-024');
      }
    }
  });

  it('counts a Halloween card as a Special Art Rare for the guarantee', () => {
    const due: PackState = { ...FRESH_STATE, sar: BOOSTER.pity.sar.after - 1, banner: banner.hit.hard - 1 };
    for (let i = 0; i < 300; i += 1) {
      const { picks, next } = roll(`event-sar-${i}`, HALLOWEEN, due);
      expect(picks[3] === undefined ? undefined : cardById(picks[3].card.id)?.rarity).toBe('SAR');
      expect(next.sar).toBe(0);
      expect(picks[4]?.reason).not.toBe('pity-sar');
    }
  });

  it('never touches the banner counters when a normal booster is rolled', () => {
    const state: PackState = { sar: 3, ur: 4, banner: 17, mainSure: true };
    const { next, picks } = roll('plain', BOOSTER, state);
    expect(next.banner).toBe(17);
    expect(next.mainSure).toBe(true);
    expect(picks.some((pick) => eventIds.has(pick.card.id))).toBe(false);
  });

  it('keeps the rest of the pack normal', () => {
    const picks = roll('rest', HALLOWEEN).picks;
    expect(picks.filter((pick) => pick.role === 'basic')).toHaveLength(3);
    expect(CATALOG.some((card) => card.id === picks[4]?.card.id)).toBe(true);
  });
});
