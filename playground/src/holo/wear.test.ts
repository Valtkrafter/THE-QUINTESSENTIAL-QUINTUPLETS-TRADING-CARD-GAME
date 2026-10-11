import { describe, expect, it } from 'vitest';
import { wearSeedOf, wearVector } from './wear';

describe('wear of a copy', () => {
  it('is nothing for a perfect copy and grows as the sub-grades fall', () => {
    expect(wearVector({ centering: 10, corners: 10, edges: 10, surface: 10 })).toEqual([0, 0, 0, 0]);
    const worn = wearVector({ centering: 1, corners: 5.5, edges: 9, surface: 10 });
    expect(worn[0]).toBe(1);
    expect(worn[1]).toBeCloseTo(0.5);
    expect(worn[2]).toBeCloseTo(1 / 9);
    expect(worn[3]).toBe(0);
  });

  it('gives every copy its own number between 0 and 1, the same one every time', () => {
    const a = wearSeedOf('c000001');
    expect(wearSeedOf('c000001')).toBe(a);
    expect(wearSeedOf('c000002')).not.toBe(a);
    for (const key of ['', 'c000001', 'c999999', 'x'.repeat(100)]) {
      const seed = wearSeedOf(key);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(1);
    }
  });
});
