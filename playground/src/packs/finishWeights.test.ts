import { describe, expect, it } from 'vitest';
import { RARITIES } from '../cards/model';
import { createRng } from '../domain/random';
import { FINISH_TIER, TIER_WEIGHTS, pickFinish, tierChances } from './finishWeights';

const DRAWS = 40000;

describe('pickFinish', () => {
  it('is repeatable for the same seed', () => {
    const run = () => {
      const rng = createRng('finish');
      return Array.from({ length: 200 }, () => pickFinish('SAR', rng.next));
    };
    expect(run()).toEqual(run());
  });

  it('never rolls a premium finish for a Common', () => {
    const rng = createRng('common');
    for (let i = 0; i < DRAWS; i += 1) {
      expect(FINISH_TIER[pickFinish('C', rng.next)]).not.toBe('premium');
    }
  });

  it.each(RARITIES.map((r) => r.id))('matches the published tier odds for %s', (rarity) => {
    const rng = createRng(`odds-${rarity}`);
    const counts = { plain: 0, foil: 0, premium: 0 };
    for (let i = 0; i < DRAWS; i += 1) {
      counts[FINISH_TIER[pickFinish(rarity, rng.next)]] += 1;
    }
    const weights = TIER_WEIGHTS[rarity];
    const total = weights.plain + weights.foil + weights.premium;
    for (const tier of ['plain', 'foil', 'premium'] as const) {
      expect(Math.abs(counts[tier] / DRAWS - weights[tier] / total)).toBeLessThan(0.012);
    }
  });

  it('can roll every finish for an Ultra Rare', () => {
    const rng = createRng('all-finishes');
    const seen = new Set<string>();
    for (let i = 0; i < DRAWS; i += 1) {
      seen.add(pickFinish('UR', rng.next));
    }
    expect([...seen].sort()).toEqual(Object.keys(FINISH_TIER).sort());
  });

  it('makes foil and premium finishes more likely in a pack with a lean, and the chances still add up to one', () => {
    for (const { id } of RARITIES) {
      const plain = tierChances(id);
      const leaned = tierChances(id, 3);
      expect(plain.plain + plain.foil + plain.premium).toBeCloseTo(1, 10);
      expect(leaned.plain + leaned.foil + leaned.premium).toBeCloseTo(1, 10);
      expect(leaned.plain).toBeLessThanOrEqual(plain.plain);
      expect(leaned.foil + leaned.premium).toBeGreaterThanOrEqual(plain.foil + plain.premium);
    }
    expect(tierChances('C', 3).premium).toBe(0);
  });

  it('follows the lean in the dice too', () => {
    const rng = createRng('lean');
    const counts = { plain: 0, foil: 0, premium: 0 };
    for (let i = 0; i < DRAWS; i += 1) {
      counts[FINISH_TIER[pickFinish('AR', rng.next, 3)]] += 1;
    }
    const expected = tierChances('AR', 3);
    for (const tier of ['plain', 'foil', 'premium'] as const) {
      expect(Math.abs(counts[tier] / DRAWS - expected[tier])).toBeLessThan(0.012);
    }
  });
});
