// Seeded random numbers for everything that must be repeatable: pack pulls, finish rolls, AI decisions, tests.
// Never use Math.random in game logic. The generator is sfc32 (four 32-bit words, fast, good quality).

export type RngState = [number, number, number, number];

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** One random item. Throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** New shuffled array (Fisher-Yates); the input is not changed. */
  shuffle<T>(items: readonly T[]): T[];
  /** Independent child stream; advances this stream by exactly one step, so forks are repeatable too. */
  fork(): Rng;
  /** Snapshot that `restoreRng` can continue from (for saved games and replays). */
  state(): RngState;
}

const TWO_POW_32 = 4294967296;
const WARM_UP_STEPS = 12;

/** Turns any string into four well-mixed 32-bit words (xmur3). */
function hashSeed(seed: string): RngState {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const nextWord = (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
  return [nextWord(), nextWord(), nextWord(), nextWord()];
}

function fromState(initial: Readonly<RngState>): Rng {
  let [a, b, c, d] = initial;

  const next = (): number => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / TWO_POW_32;
  };

  const int = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
      throw new RangeError(`int() needs a whole number of at least 1, got ${maxExclusive}.`);
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(Math.max(items.length, 1))];
    if (item === undefined) {
      throw new RangeError('pick() needs a non-empty list.');
    }
    return item;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      const swapped = result[i] as T;
      result[i] = result[j] as T;
      result[j] = swapped;
    }
    return result;
  };

  const state = (): RngState => [a | 0, b | 0, c | 0, d | 0];

  const fork = (): Rng => {
    const salt = Math.floor(next() * TWO_POW_32) >>> 0;
    const [x, y, z, w] = state();
    return createFromWords([x ^ salt, y, z, w]);
  };

  return { next, int, pick, shuffle, fork, state };
}

function createFromWords(words: Readonly<RngState>): Rng {
  const rng = fromState(words);
  for (let i = 0; i < WARM_UP_STEPS; i += 1) {
    rng.next();
  }
  return rng;
}

/** Same seed, same sequence, on every machine. */
export function createRng(seed: string | number): Rng {
  return createFromWords(hashSeed(String(seed)));
}

/** Continues exactly where `Rng.state()` was taken (no warm-up, the state is already mixed). */
export function restoreRng(state: Readonly<RngState>): Rng {
  return fromState(state);
}
