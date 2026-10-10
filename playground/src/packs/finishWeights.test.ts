import { describe, expect, it } from 'vitest';
import { RARITIES } from '../cards/model';
import { createRng } from '../domain/random';
import { FINISH_TIER, TIER_WEIGHTS, pickFinish } from './finishWeights';

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
});
