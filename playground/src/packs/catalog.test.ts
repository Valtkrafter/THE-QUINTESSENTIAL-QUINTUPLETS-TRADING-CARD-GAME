import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { PACKS, eventCards, isLimited, packById, parsePacks } from './catalog';

type Raw = Record<string, unknown>;

function rawPacks(): Raw[] {
  return JSON.parse(JSON.stringify(PACKS)) as Raw[];
}

function halloween(raw: Raw[]): Raw {
  const pack = raw.find((entry) => entry['id'] === 'halloween');
  if (pack === undefined) {
    throw new Error('The test data has no halloween pack.');
  }
  return pack;
}

describe('pack data', () => {
  it('has the normal booster and the Halloween banner pack, five slots each', () => {
    expect(PACKS.map((pack) => pack.id)).toEqual(['booster', 'halloween']);
    for (const pack of PACKS) {
      expect(pack.slots.map((slot) => slot.role)).toEqual(['basic', 'basic', 'basic', 'plus', 'hit']);
      expect(pack.price).toBe(500);
    }
    expect(packById('nothing')).toBeUndefined();
  });

  it('keeps every slot table at 100 so the numbers read as percent', () => {
    for (const pack of PACKS) {
      for (const slot of pack.slots) {
        expect(Object.values(slot.table).reduce((sum, weight) => sum + weight, 0)).toBe(100);
      }
    }
  });

  it('knows ten Halloween cards, and normal packs never contain them', () => {
    expect(eventCards('halloween')).toHaveLength(10);
    expect(CATALOG.filter(isLimited)).toHaveLength(10);
  });

  it('runs the banner from 10 October to 4 November in two phases with two main cards each', () => {
    const banner = packById('halloween')?.banner;
    expect(banner?.from).toBe('2026-10-10');
    expect(banner?.to).toBe('2026-11-04');
    expect(banner?.phases).toHaveLength(2);
    expect(banner?.phases.map((phase) => phase.mains.length)).toEqual([2, 2]);
  });
});

describe('pack data checks', () => {
  it('accepts the shipped data again', () => {
    expect(parsePacks(rawPacks())).toHaveLength(2);
  });

  it('stops on a slot that lists a rarity no normal card has', () => {
    const raw = rawPacks();
    const slots = (raw[0] as { slots: { table: Record<string, number> }[] }).slots;
    const first = slots[0];
    if (first !== undefined) {
      first.table = { C: 50, MYTHIC: 50 };
    }
    expect(() => parsePacks(raw)).toThrow(/invalid/);
  });

  it('stops when a banner phase does not start right after the one before', () => {
    const raw = rawPacks();
    const banner = halloween(raw)['banner'] as { phases: { from: string }[] };
    const second = banner.phases[1];
    if (second !== undefined) {
      second.from = '2026-10-25';
    }
    expect(() => parsePacks(raw)).toThrow(/does not start right after/);
  });

  it('stops when a main card is not an event card', () => {
    const raw = rawPacks();
    const banner = halloween(raw)['banner'] as { phases: { mains: string[] }[] };
    const first = banner.phases[0];
    if (first !== undefined) {
      first.mains = ['TQQ01-001', 'TQQ01-023'];
    }
    expect(() => parsePacks(raw)).toThrow(/not a card of event/);
  });

  it('stops when the Ultra Rare guarantee comes before the Special Art Rare one', () => {
    const raw = rawPacks();
    (raw[0] as { pity: { ur: { after: number } } }).pity.ur.after = 5;
    expect(() => parsePacks(raw)).toThrow(/must not come before/);
  });

  it('stops when the soft guarantee starts after the hard one', () => {
    const raw = rawPacks();
    const banner = halloween(raw)['banner'] as { hit: { softFrom: number } };
    banner.hit.softFrom = 80;
    expect(() => parsePacks(raw)).toThrow(/soft guarantee/);
  });

  it('stops when two packs share an id', () => {
    const raw = rawPacks();
    const second = raw[1];
    if (second !== undefined) {
      second['id'] = 'booster';
      delete second['banner'];
    }
    expect(() => parsePacks(raw)).toThrow(/used twice/);
  });
});
