import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { HISTORY_LIMIT, earnYen, newSaveGame, parseSave, serializeSave, type SaveGame } from '../domain/save';
import { PackError, canOpen, openPack, pityStatus } from './openPack';
import { packById } from './catalog';

const KNOWN = new Set(CATALOG.map((card) => card.id));
const NOW = 1_760_000_000_000;
const TODAY = '2026-10-12';

function rich(seed: string, yen = 100_000): SaveGame {
  return earnYen(newSaveGame(seed, NOW), yen, NOW);
}

describe('opening a pack', () => {
  it('pays the price, files five cards and counts the pack', () => {
    const save = rich('open');
    const opening = openPack(save, 'booster', TODAY, NOW + 1);
    expect(opening.pulls).toHaveLength(5);
    expect(opening.save.player.yen).toBe(save.player.yen - 500);
    expect(opening.save.collection).toHaveLength(5);
    expect(opening.save.counters.packsOpened).toBe(1);
    expect(opening.save.collection.map((copy) => copy.obtained.source)).toEqual(['pack', 'pack', 'pack', 'pack', 'pack']);
    expect(opening.pulls.map((pull) => pull.owned.uid)).toEqual(opening.save.collection.map((copy) => copy.uid));
    expect(opening.pulls.map((pull) => pull.card.id)).toEqual(opening.save.collection.map((copy) => copy.cardId));
  });

  it('opens a free pack from the Card-Dex without paying, and only the normal pack', () => {
    const empty = { ...newSaveGame('free', NOW), player: { yen: 0 } };
    expect(() => openPack(empty, 'booster', TODAY, NOW, { free: true })).toThrow(PackError);
    const waiting: SaveGame = { ...empty, dexRewards: { milestones: 1, characters: [], freePacks: 2 } };
    const opening = openPack(waiting, 'booster', TODAY, NOW + 1, { free: true });
    expect(opening.pulls).toHaveLength(5);
    expect(opening.save.player.yen).toBe(0);
    expect(opening.save.dexRewards.freePacks).toBe(1);
    expect(opening.save.counters.packsOpened).toBe(1);
    expect(() => openPack(waiting, 'halloween', TODAY, NOW, { free: true })).toThrow(PackError);
    // Without the option the pack still has to be paid for.
    expect(() => openPack(waiting, 'booster', TODAY, NOW)).toThrow(/costs/);
  });

  it('does not change the save it was given', () => {
    const save = rich('pure');
    const before = serializeSave(save);
    openPack(save, 'booster', TODAY, NOW);
    expect(serializeSave(save)).toBe(before);
  });

  it('gives the same pack for the same save and a different one for the next pack', () => {
    const save = rich('repeat');
    const a = openPack(save, 'booster', TODAY, NOW);
    const b = openPack(save, 'booster', TODAY, NOW);
    expect(a.save).toEqual(b.save);
    const next = openPack(a.save, 'booster', TODAY, NOW + 1);
    expect(next.pulls.map((pull) => pull.card.id)).not.toEqual(a.pulls.map((pull) => pull.card.id));
  });

  it('marks cards as new only the first time, also inside one pack', () => {
    let save = rich('new');
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const opening = openPack(save, 'booster', TODAY, NOW + i);
      for (const pull of opening.pulls) {
        expect(pull.isNew).toBe(!seen.has(pull.card.id));
        seen.add(pull.card.id);
      }
      save = opening.save;
    }
  });

  it('keeps a valid save that survives saving and loading', () => {
    let save = rich('valid');
    for (let i = 0; i < 12; i += 1) {
      save = openPack(save, 'booster', TODAY, NOW + i).save;
    }
    expect(parseSave(serializeSave(save), KNOWN)).toEqual(save);
  });

  it('remembers the latest opened packs and no more than the limit', () => {
    let save = rich('history', 1_000_000);
    for (let i = 0; i < HISTORY_LIMIT + 8; i += 1) {
      save = openPack(save, 'booster', TODAY, NOW + i).save;
    }
    expect(save.packHistory).toHaveLength(HISTORY_LIMIT);
    expect(save.packHistory.at(-1)?.at).toBe(NOW + HISTORY_LIMIT + 7);
    expect(save.packHistory.every((entry) => entry.cards.length === 5 && entry.pack === 'booster')).toBe(true);
  });
});

describe('what stops a pack from opening', () => {
  it('refuses when the purse is too small, and leaves everything as it was', () => {
    const save = newSaveGame('poor', NOW);
    const poor = { ...save, player: { yen: 499 } };
    expect(canOpen(poor, 'booster', TODAY)).toBe(false);
    expect(() => openPack(poor, 'booster', TODAY, NOW)).toThrow(PackError);
    try {
      openPack(poor, 'booster', TODAY, NOW);
    } catch (error) {
      expect(error).toBeInstanceOf(PackError);
      expect((error as PackError).code).toBe('not-enough-yen');
    }
    expect(poor.collection).toHaveLength(0);
  });

  it('lets a player with exactly the price open a pack and ends with an empty purse', () => {
    const save = { ...newSaveGame('exact', NOW), player: { yen: 500 } };
    expect(canOpen(save, 'booster', TODAY)).toBe(true);
    expect(openPack(save, 'booster', TODAY, NOW).save.player.yen).toBe(0);
  });

  it('refuses a pack that does not exist', () => {
    expect(() => openPack(rich('x'), 'mystery', TODAY, NOW)).toThrow(/no pack called/);
    expect(canOpen(rich('x'), 'mystery', TODAY)).toBe(false);
  });

  it('opens the Halloween pack only while the banner runs', () => {
    const save = rich('banner');
    for (const closed of ['2026-10-09', '2026-11-05', '2027-10-20']) {
      expect(canOpen(save, 'halloween', closed)).toBe(false);
      expect(() => openPack(save, 'halloween', closed, NOW)).toThrow(/not running/);
    }
    for (const open of ['2026-10-10', '2026-10-23', '2026-11-04']) {
      expect(canOpen(save, 'halloween', open)).toBe(true);
      expect(openPack(save, 'halloween', open, NOW).pack.id).toBe('halloween');
    }
  });
});

describe('the guarantee counters in the save', () => {
  it('count up with every pack and reset when the hit arrives', () => {
    let save = rich('counters', 1_000_000);
    const pack = packById('booster');
    if (pack === undefined) {
      throw new Error('missing pack');
    }
    let lastSar = 0;
    for (let i = 1; i <= 120; i += 1) {
      const opening = openPack(save, 'booster', TODAY, NOW + i);
      save = opening.save;
      const hasTop = opening.pulls.some((pull) => pull.card.rarity === 'SAR' || pull.card.rarity === 'UR');
      lastSar = hasTop ? 0 : lastSar + 1;
      expect(pityStatus(save, pack).sar.count).toBe(lastSar);
      // The guarantee holds: never more packs than the published number without a Special Art Rare or better.
      expect(lastSar).toBeLessThan(pack.pity.sar.after);
    }
  });

  it('never leave more than 90 packs without an Ultra Rare, whatever the dice do', () => {
    let save = rich('ur-limit', 10_000_000);
    let gap = 0;
    let longest = 0;
    for (let i = 0; i < 500; i += 1) {
      const opening = openPack(save, 'booster', TODAY, NOW + i);
      save = opening.save;
      gap = opening.pulls.some((pull) => pull.card.rarity === 'UR') ? 0 : gap + 1;
      longest = Math.max(longest, gap);
    }
    expect(longest).toBeLessThan(90);
  });

  it('keep the banner counter and the 50/50 memory in the save, and only for banner packs', () => {
    const halloween = packById('halloween');
    if (halloween === undefined) {
      throw new Error('missing pack');
    }
    let save = rich('banner-counters', 1_000_000);
    save = openPack(save, 'booster', TODAY, NOW).save;
    expect(save.counters.pity['banner:halloween']).toBeUndefined();
    let since = 0;
    for (let i = 1; i <= 160; i += 1) {
      const opening = openPack(save, 'halloween', TODAY, NOW + i);
      save = opening.save;
      const hit = opening.pulls.some((pull) => pull.reason === 'banner-main' || pull.reason === 'banner-side');
      since = hit ? 0 : since + 1;
      expect(pityStatus(save, halloween).banner?.count).toBe(since);
      expect(since).toBeLessThan(halloween.banner?.hit.hard ?? 0);
    }
  });

  it('carry the banner counter over from phase one to phase two', () => {
    const halloween = packById('halloween');
    let save = rich('phases', 1_000_000);
    for (let i = 0; i < 20; i += 1) {
      save = openPack(save, 'halloween', '2026-10-20', NOW + i).save;
    }
    const before = halloween === undefined ? undefined : pityStatus(save, halloween).banner?.count;
    const after = openPack(save, 'halloween', '2026-10-23', NOW + 99);
    const hit = after.pulls.some((pull) => pull.reason === 'banner-main' || pull.reason === 'banner-side');
    expect(halloween === undefined ? undefined : pityStatus(after.save, halloween).banner?.count).toBe(hit ? 0 : (before ?? 0) + 1);
  });
});
