import { describe, expect, it } from 'vitest';
import artManifest from '../data/art-manifest.json';
import { CATALOG, SET_SIZE, cardById, parseCatalog } from './catalog';
import { CHARACTERS, resistanceOf, weaknessOf } from './characters';
import { SISTERS, SUPPORTING_CAST, type Rarity } from './model';
import type { Card, CharacterCard } from './schema';

const characters = CATALOG.filter((card): card is CharacterCard => card.kind === 'character');

/** The tier ladder every sister shares (docs/card-system.md). */
const LADDER: readonly { readonly slot: string; readonly rarity: Rarity; readonly stage: string; readonly prime: boolean }[] = [
  { slot: 't01', rarity: 'C', stage: 'basic', prime: false },
  { slot: 't02', rarity: 'C', stage: 'basic', prime: false },
  { slot: 't03', rarity: 'U', stage: 'basic', prime: false },
  { slot: 't04', rarity: 'U', stage: 'close', prime: false },
  { slot: 't05', rarity: 'R', stage: 'close', prime: false },
  { slot: 't06', rarity: 'R', stage: 'bride', prime: false },
  { slot: 't07', rarity: 'RR', stage: 'close', prime: true },
  { slot: 't08', rarity: 'AR', stage: 'basic', prime: false },
  { slot: 't09', rarity: 'SAR', stage: 'bride', prime: true },
  { slot: 't10', rarity: 'UR', stage: 'bride', prime: true },
];

describe('card catalog', () => {
  it('has the 79 cards of set TQQ01 in print order', () => {
    expect(SET_SIZE).toBe(79);
    expect(CATALOG.map((card) => card.number)).toEqual(Array.from({ length: 79 }, (_, i) => i + 1));
  });

  it('gives each sister 12 cards and each supporting character the planned amount', () => {
    for (const sister of SISTERS) {
      expect(CATALOG.filter((card) => card.character === sister)).toHaveLength(12);
    }
    const expected = { fuutarou: 6, raiha: 4, isanari: 3, maruo: 3, yusuke: 3 };
    for (const name of SUPPORTING_CAST) {
      expect(CATALOG.filter((card) => card.character === name)).toHaveLength(expected[name]);
    }
  });

  it('follows the shared ladder for every sister', () => {
    for (const sister of SISTERS) {
      for (const step of LADDER) {
        const card = characters.find((c) => c.character === sister && c.art.slot === step.slot);
        expect(card, `${sister} ${step.slot}`).toBeDefined();
        expect([card?.rarity, card?.stage, card?.prime]).toEqual([step.rarity, step.stage, step.prime]);
      }
    }
  });

  it('points every card at a picture in the art manifest', () => {
    const manifest: Record<string, Record<string, unknown>> = artManifest;
    for (const card of CATALOG) {
      expect(manifest[card.art.character]?.[card.art.slot], `${card.id} art ${card.art.character}/${card.art.slot}`).toBeDefined();
    }
  });

  it('can look cards up by id', () => {
    expect(cardById('TQQ01-001')?.number).toBe(1);
    expect(cardById('TQQ01-079')?.character).toBe('yusuke');
    expect(cardById('nope')).toBeUndefined();
  });
});

describe('character rules', () => {
  it('uses the Heart cycle for weakness and resistance', () => {
    for (const card of characters) {
      expect(card.affinity).toBe(CHARACTERS[card.character].affinity);
      expect(card.weakness).toBe(weaknessOf(card.affinity));
      expect(card.resistance).toBe(resistanceOf(card.affinity));
    }
  });

  it('only asks for Hearts the sister can attach', () => {
    for (const card of characters) {
      for (const move of card.moves) {
        for (const heart of move.cost) {
          expect(['study', card.affinity], `${card.id} ${move.name}`).toContain(heart);
        }
      }
    }
  });

  it('gives Prime cards clearly more HP than a normal card of the same stage', () => {
    const hp = (stage: string, prime: boolean) => characters.filter((c) => c.stage === stage && c.prime === prime).map((c) => c.hp);
    for (const stage of ['close', 'bride']) {
      expect(Math.min(...hp(stage, true))).toBeGreaterThan(Math.max(...hp(stage, false)));
    }
  });

  it('describes every printed effect text with data and the other way round', () => {
    for (const card of characters) {
      const printed: { readonly where: string; readonly text: string | undefined; readonly effects: readonly unknown[] }[] = card.moves.map((move) => ({
        where: `${card.id} ${move.name}`,
        text: move.text,
        effects: move.effects,
      }));
      if (card.ability !== undefined) {
        printed.push({ where: `${card.id} ${card.ability.name}`, text: card.ability.text, effects: card.ability.effects });
      }
      for (const entry of printed) {
        expect(entry.text !== undefined && entry.text.length > 0, `${entry.where} text`).toBe(entry.effects.length > 0);
      }
    }
  });
});

describe('Halloween cards', () => {
  const halloween = characters.filter((card) => card.stage === 'event');

  it('are two per sister, limited to one per deck', () => {
    expect(halloween).toHaveLength(10);
    for (const sister of SISTERS) {
      expect(halloween.filter((card) => card.character === sister).map((card) => card.art.slot).sort()).toEqual(['h1', 'h2']);
    }
    for (const card of halloween) {
      expect(card.limited).toEqual({ eventId: 'halloween', maxPerDeck: 1 });
      expect(card.prime).toBe(true);
    }
  });

  it('have more HP than any normal Basic and their own effect', () => {
    const bestBasic = Math.max(...characters.filter((c) => c.stage === 'basic').map((c) => c.hp));
    for (const card of halloween) {
      expect(card.hp).toBeGreaterThan(bestBasic);
      const effects = [...card.moves.flatMap((m) => m.effects), ...(card.ability?.effects ?? [])];
      expect(effects.length, card.id).toBeGreaterThan(0);
    }
  });

  it('are the only limited cards', () => {
    expect(characters.filter((card) => card.limited !== undefined)).toEqual(halloween);
  });
});

describe('supporters', () => {
  it('all have a printed text and at least one effect', () => {
    for (const card of CATALOG) {
      if (card.kind === 'supporter') {
        expect(card.text.length).toBeGreaterThan(10);
        expect(card.effects.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('parseCatalog', () => {
  const valid = CATALOG.slice(0, 3).map((card) => structuredClone(card)) as unknown[];

  function mutate(index: number, change: (card: Record<string, unknown>) => void): unknown[] {
    const copy = structuredClone(valid) as Record<string, unknown>[];
    const target = copy[index];
    if (target === undefined) {
      throw new Error('no card to change');
    }
    change(target);
    return copy;
  }

  it('accepts good data', () => {
    expect(parseCatalog(valid)).toHaveLength(3);
  });

  it('rejects an unknown effect and names the problem', () => {
    const bad = mutate(0, (card) => {
      const moves = card['moves'] as { effects: unknown[] }[];
      moves[0]?.effects.push({ type: 'explode' });
    });
    expect(() => parseCatalog(bad)).toThrow(/Card data is invalid/);
  });

  it('rejects a misspelled field instead of ignoring it', () => {
    const bad = mutate(1, (card) => {
      card['hitpoints'] = 70;
    });
    expect(() => parseCatalog(bad)).toThrow(/Card data is invalid/);
  });

  it('rejects numbers that are out of order or ids that do not match', () => {
    const bad = mutate(2, (card) => {
      card['id'] = 'TQQ01-009';
      card['number'] = 9;
    });
    expect(() => parseCatalog(bad)).toThrow(/inconsistent/);
  });

  it('rejects art that shows another character', () => {
    const bad = mutate(0, (card) => {
      card['art'] = { character: 'nino', slot: 't01' };
    });
    expect(() => parseCatalog(bad)).toThrow(/Card data is invalid/);
  });

  it('rejects an event card that is not limited', () => {
    const copy = characters.filter((card) => card.stage === 'event').slice(0, 1).map((card) => structuredClone(card) as Record<string, unknown>);
    const only = copy[0];
    if (only === undefined) {
      throw new Error('no event card');
    }
    only['id'] = 'TQQ01-001';
    only['number'] = 1;
    delete only['limited'];
    expect(() => parseCatalog([only])).toThrow(/Card data is invalid/);
  });
});

// Keep the Card type in use so a rename in the schema shows up here first.
export type { Card };
