import { describe, expect, it } from 'vitest';
import { createRng, restoreRng } from './random';

function take(count: number, rng: ReturnType<typeof createRng>): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(50, createRng('tqq'))).toEqual(take(50, createRng('tqq')));
  });

  it('treats a number seed like its text form', () => {
    expect(take(10, createRng(42))).toEqual(take(10, createRng('42')));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(10, createRng('a'))).not.toEqual(take(10, createRng('b')));
  });

  it('stays inside [0, 1)', () => {
    const values = take(20000, createRng('range'));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('has a sensible mean', () => {
    const values = take(50000, createRng('mean'));
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.49);
    expect(mean).toBeLessThan(0.51);
  });
});

describe('int', () => {
  it('only returns whole numbers below the limit and covers them evenly', () => {
    const rng = createRng('int');
    const buckets = new Array<number>(6).fill(0);
    const draws = 60000;
    for (let i = 0; i < draws; i += 1) {
      const value = rng.int(6);
      expect(Number.isInteger(value)).toBe(true);
      buckets[value] = (buckets[value] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(count / draws).toBeGreaterThan(1 / 6 - 0.01);
      expect(count / draws).toBeLessThan(1 / 6 + 0.01);
    }
  });

  it('rejects limits that make no sense', () => {
    const rng = createRng('bad');
    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.int(-3)).toThrow(RangeError);
    expect(() => rng.int(2.5)).toThrow(RangeError);
  });
});

describe('pick and shuffle', () => {
  it('picks an item of the list and throws on an empty list', () => {
    const rng = createRng('pick');
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('shuffles into a new array with the same items and leaves the input alone', () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    const copy = [...input];
    const shuffled = createRng('shuffle').shuffle(input);
    expect(input).toEqual(copy);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(copy);
    expect(shuffled).not.toEqual(copy);
  });

  it('shuffles the same way for the same seed', () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    expect(createRng('s').shuffle(input)).toEqual(createRng('s').shuffle(input));
  });

  it('puts every item on every position about equally often', () => {
    const rng = createRng('fair');
    const firstPlace = new Array<number>(4).fill(0);
    const rounds = 40000;
    for (let i = 0; i < rounds; i += 1) {
      const first = rng.shuffle([0, 1, 2, 3])[0] ?? 0;
      firstPlace[first] = (firstPlace[first] ?? 0) + 1;
    }
    for (const count of firstPlace) {
      expect(count / rounds).toBeGreaterThan(0.24);
      expect(count / rounds).toBeLessThan(0.26);
    }
  });
});

describe('state and fork', () => {
  it('continues exactly after a restore', () => {
    const rng = createRng('save');
    take(25, rng);
    const snapshot = rng.state();
    const expected = take(25, rng);
    expect(take(25, restoreRng(snapshot))).toEqual(expected);
  });

  it('forks into streams that differ from the parent but are repeatable', () => {
    const parentA = createRng('fork');
    const childA = parentA.fork();
    const parentB = createRng('fork');
    const childB = parentB.fork();
    expect(take(20, childA)).toEqual(take(20, childB));
    expect(take(20, parentA)).toEqual(take(20, parentB));
    expect(take(20, createRng('fork').fork())).not.toEqual(take(20, createRng('fork')));
  });
});
