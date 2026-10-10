import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { rollCondition } from './ownership';
import { createRng } from './random';
import {
  SAVE_VERSION,
  SHOWCASE_SLOTS,
  STARTING_YEN,
  SaveError,
  addOwnedCard,
  checksum,
  newSaveGame,
  parseSave,
  saveGameSchema,
  serializeSave,
  earnYen,
  spendYen,
  withRng,
  withShowcase,
} from './save';

const KNOWN = new Set(CATALOG.map((card) => card.id));
const NOW = 1_760_000_000_000;

describe('rollCondition', () => {
  it('gives sub-grades from 1 to 10 with one decimal, mostly high', () => {
    const rng = createRng('condition');
    let sum = 0;
    let perfect = 0;
    const draws = 20000;
    for (let i = 0; i < draws; i += 1) {
      const condition = rollCondition(rng);
      for (const value of Object.values(condition)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
        expect(Math.abs(value * 10 - Math.round(value * 10))).toBeLessThan(1e-9);
        sum += value;
        if (value === 10) {
          perfect += 1;
        }
      }
    }
    const mean = sum / (draws * 4);
    expect(mean).toBeGreaterThan(8.7);
    expect(mean).toBeLessThan(9.1);
    expect(perfect / (draws * 4)).toBeGreaterThan(0.02);
    expect(perfect / (draws * 4)).toBeLessThan(0.08);
  });

  it('is repeatable for the same seed', () => {
    expect(rollCondition(createRng('same'))).toEqual(rollCondition(createRng('same')));
  });
});

describe('new save game', () => {
  it('starts empty with the starting yen and passes its own schema', () => {
    const save = newSaveGame('seed', NOW);
    expect(save.player.yen).toBe(STARTING_YEN);
    expect(save.collection).toEqual([]);
    expect(saveGameSchema.safeParse(save).success).toBe(true);
  });
});

describe('addOwnedCard', () => {
  it('numbers copies, counts prints per design and does not change the old save', () => {
    const start = newSaveGame('seed', NOW);
    const first = addOwnedCard(start, 'TQQ01-013', 'standard', 'pack', NOW + 1);
    const second = addOwnedCard(first.save, 'TQQ01-013', 'gold', 'pack', NOW + 2);
    const other = addOwnedCard(second.save, 'TQQ01-014', 'rainbow', 'shop', NOW + 3);
    expect(start.collection).toHaveLength(0);
    expect([first.owned.uid, second.owned.uid, other.owned.uid]).toEqual(['c000001', 'c000002', 'c000003']);
    expect([first.owned.serial, second.owned.serial, other.owned.serial]).toEqual([1, 2, 1]);
    expect(other.save.collection.map((card) => card.finish)).toEqual(['standard', 'gold', 'rainbow']);
    expect(other.save.updatedAt).toBe(NOW + 3);
    expect(first.owned.grade).toBeNull();
  });

  it('gives the same copies for the same seed, also after a save and load in between', () => {
    const build = (reload: boolean) => {
      let save = newSaveGame('repeat', NOW);
      for (let i = 0; i < 6; i += 1) {
        save = addOwnedCard(save, `TQQ01-0${10 + i}`, 'standard', 'pack', NOW + i).save;
        if (reload && i === 2) {
          save = parseSave(serializeSave(save), KNOWN);
        }
      }
      return save.collection.map((card) => card.condition);
    };
    expect(build(true)).toEqual(build(false));
  });
});

describe('withRng', () => {
  it('advances the generator of the save', () => {
    const save = newSaveGame('rng', NOW);
    const a = withRng(save, (rng) => rng.next());
    const b = withRng(a.save, (rng) => rng.next());
    expect(a.value).not.toBe(b.value);
    expect(withRng(save, (rng) => rng.next()).value).toBe(a.value);
  });
});

describe('saving and loading', () => {
  const game = addOwnedCard(addOwnedCard(newSaveGame('io', NOW), 'TQQ01-001', 'standard', 'starter', NOW).save, 'TQQ01-079', 'prism', 'pack', NOW + 5).save;

  it('gives back exactly what was saved', () => {
    expect(parseSave(serializeSave(game), KNOWN)).toEqual(game);
  });

  it('rejects text that is not a save', () => {
    expect(() => parseSave('hello', KNOWN)).toThrow(SaveError);
    expect(() => parseSave('{"format":"other"}', KNOWN)).toThrow(/not a TQQ save/);
  });

  it('notices a file that was changed by hand', () => {
    const text = serializeSave(game).replace(`"yen\\":${STARTING_YEN}`, '"yen\\":999999');
    expect(text).not.toBe(serializeSave(game));
    expect(() => parseSave(text, KNOWN)).toThrow(/damaged/);
  });

  it('refuses a save from a newer game version with a clear message', () => {
    const data = JSON.stringify({ ...game, version: SAVE_VERSION + 1 });
    const text = JSON.stringify({ format: 'tqq-save', checksum: checksum(data), data });
    expect(() => parseSave(text, KNOWN)).toThrow(/newer version/);
  });

  it('refuses data that breaks the rules even when the checksum is right', () => {
    const broken = { ...game, player: { yen: -5 } };
    const data = JSON.stringify(broken);
    const text = JSON.stringify({ format: 'tqq-save', checksum: checksum(data), data });
    expect(() => parseSave(text, KNOWN)).toThrow(/damaged or incomplete/);
  });

  it('refuses cards the game does not know', () => {
    const stranger = addOwnedCard(newSaveGame('x', NOW), 'TQQ01-500', 'standard', 'pack', NOW).save;
    expect(() => parseSave(serializeSave(stranger), KNOWN)).toThrow(/does not know: TQQ01-500/);
  });

  it('refuses the same copy twice', () => {
    const twice = { ...game, collection: [...game.collection, ...game.collection] };
    const data = JSON.stringify(twice);
    const text = JSON.stringify({ format: 'tqq-save', checksum: checksum(data), data });
    expect(() => parseSave(text, KNOWN)).toThrow(/same copy twice/);
  });
});

describe('showcase', () => {
  const start = addOwnedCard(addOwnedCard(newSaveGame('show', NOW), 'TQQ01-001', 'standard', 'pack', NOW).save, 'TQQ01-002', 'gold', 'pack', NOW).save;

  it('keeps the shelf order and survives saving and loading', () => {
    const shown = withShowcase(start, ['c000002', 'c000001'], NOW + 1);
    expect(shown.showcase).toEqual(['c000002', 'c000001']);
    expect(shown.updatedAt).toBe(NOW + 1);
    expect(start.showcase).toEqual([]);
    expect(parseSave(serializeSave(shown), KNOWN)).toEqual(shown);
  });

  it('refuses copies that are missing, doubled or too many', () => {
    expect(() => withShowcase(start, ['c000099'], NOW)).toThrow(/not in the collection/);
    expect(() => withShowcase(start, ['c000001', 'c000001'], NOW)).toThrow(/twice/);
    const many = Array.from({ length: SHOWCASE_SLOTS + 1 }, (_, i) => `c${String(i + 1).padStart(6, '0')}`);
    expect(() => withShowcase(start, many, NOW)).toThrow(/at most/);
  });

  it('refuses a stored showcase that points at a copy the player does not own', () => {
    const data = JSON.stringify({ ...start, showcase: ['c000042'] });
    const text = JSON.stringify({ format: 'tqq-save', checksum: checksum(data), data });
    expect(() => parseSave(text, KNOWN)).toThrow(/showcase/);
  });
});

describe('upgrading an old save', () => {
  function oldText(version: 1 | 2): string {
    const current = addOwnedCard(newSaveGame('old', NOW), 'TQQ01-010', 'rainbow', 'starter', NOW).save;
    const { showcase, daily: _daily, packHistory: _history, ...rest } = current;
    const { flags: _flags, ...counters } = rest.counters;
    const shape = version === 1 ? { ...rest, counters, version } : { ...rest, counters, showcase, version };
    const data = JSON.stringify(shape);
    return JSON.stringify({ format: 'tqq-save', checksum: checksum(data), data });
  }

  it('opens a version 1 save (before the showcase existed)', () => {
    const upgraded = parseSave(oldText(1), KNOWN);
    expect(upgraded.version).toBe(SAVE_VERSION);
    expect(upgraded.showcase).toEqual([]);
    expect(upgraded.daily).toEqual({ lastClaim: null });
    expect(upgraded.packHistory).toEqual([]);
    expect(upgraded.counters.flags).toEqual({});
    expect(upgraded.collection.map((card) => card.cardId)).toEqual(['TQQ01-010']);
  });

  it('opens a version 2 save (before the daily bonus and pack history existed)', () => {
    const upgraded = parseSave(oldText(2), KNOWN);
    expect(upgraded.version).toBe(SAVE_VERSION);
    expect(upgraded.daily.lastClaim).toBeNull();
    expect(upgraded.counters.flags).toEqual({});
    expect(upgraded.collection).toHaveLength(1);
  });
});

describe('yen', () => {
  const save = newSaveGame('yen', NOW);

  it('spends and earns without touching the old save', () => {
    const less = spendYen(save, 500, NOW + 1);
    const more = earnYen(less, 200, NOW + 2);
    expect([save.player.yen, less.player.yen, more.player.yen]).toEqual([STARTING_YEN, STARTING_YEN - 500, STARTING_YEN - 300]);
  });

  it('never lets the purse go below zero', () => {
    expect(() => spendYen(save, STARTING_YEN + 1, NOW)).toThrow(/Not enough yen/);
    expect(spendYen(save, STARTING_YEN, NOW).player.yen).toBe(0);
  });

  it('refuses amounts that are negative or not whole', () => {
    expect(() => spendYen(save, -1, NOW)).toThrow(RangeError);
    expect(() => earnYen(save, 1.5, NOW)).toThrow(RangeError);
  });
});
