import { describe, expect, it } from 'vitest';
import { SET_SIZE } from '../cards/catalog';
import { NO_FILTER, activeFilterCount, bestCopy, buildDex, dexProgress, dexProgressByCharacter, filterCollection, sortCollection } from './collection';
import { addOwnedCard, newSaveGame, type SaveGame } from './save';

const NOW = 1_760_000_000_000;

function collect(...entries: readonly (readonly [string, Parameters<typeof addOwnedCard>[2]])[]): SaveGame {
  let save = newSaveGame('collection', NOW);
  entries.forEach(([cardId, finish], index) => {
    save = addOwnedCard(save, cardId, finish, 'pack', NOW + index).save;
  });
  return save;
}

// TQQ01-001..012 Ichika (heart), 013..024 Nino, 061 Fuutarou. Rarities follow the tier ladder C C U U R R RR AR SAR UR.
const save = collect(
  ['TQQ01-012', 'gold'],
  ['TQQ01-001', 'standard'],
  ['TQQ01-013', 'rainbow'],
  ['TQQ01-001', 'prism'],
  ['TQQ01-061', 'standard'],
);

function ids(copies: readonly { readonly uid: string }[]): string[] {
  return copies.map((copy) => copy.uid);
}

describe('filterCollection', () => {
  it('keeps everything when no filter is set', () => {
    expect(filterCollection(save.collection, NO_FILTER)).toHaveLength(5);
  });

  it('filters by character, rarity and finish, and combines the filters', () => {
    expect(filterCollection(save.collection, { ...NO_FILTER, characters: ['nino'] }).map((copy) => copy.cardId)).toEqual(['TQQ01-013']);
    expect(filterCollection(save.collection, { ...NO_FILTER, finishes: ['standard'] })).toHaveLength(2);
    expect(filterCollection(save.collection, { ...NO_FILTER, characters: ['ichika'], finishes: ['prism', 'gold'] })).toHaveLength(2);
    expect(filterCollection(save.collection, { ...NO_FILTER, characters: ['nino'], finishes: ['gold'] })).toHaveLength(0);
  });

  it('searches names, titles and ids, ignoring case and word order', () => {
    expect(filterCollection(save.collection, { ...NO_FILTER, query: 'NINO' }).map((copy) => copy.cardId)).toEqual(['TQQ01-013']);
    expect(filterCollection(save.collection, { ...NO_FILTER, query: '中野 一花' })).toHaveLength(3);
    expect(filterCollection(save.collection, { ...NO_FILTER, query: 'tqq01-061' })).toHaveLength(1);
    expect(filterCollection(save.collection, { ...NO_FILTER, query: 'ichika zzzz' })).toHaveLength(0);
  });

  it('counts the active filters for the button label', () => {
    expect(activeFilterCount(NO_FILTER)).toBe(0);
    expect(activeFilterCount({ query: ' ', characters: [], rarities: [], finishes: [] })).toBe(0);
    expect(activeFilterCount({ query: 'x', characters: ['nino', 'miku'], rarities: [], finishes: ['gold'] })).toBe(3);
  });
});

describe('sortCollection', () => {
  it('sorts by print order, with the first print of a design first', () => {
    expect(sortCollection(save.collection, 'number').map((copy) => `${copy.cardId}#${copy.serial}`)).toEqual([
      'TQQ01-001#1',
      'TQQ01-001#2',
      'TQQ01-012#1',
      'TQQ01-013#1',
      'TQQ01-061#1',
    ]);
  });

  it('sorts by rarity (rarest first), finish (fanciest first) and received date (newest first)', () => {
    expect(sortCollection(save.collection, 'rarity')[0]?.cardId).toBe('TQQ01-012');
    expect(sortCollection(save.collection, 'finish').map((copy) => copy.finish)).toEqual(['prism', 'gold', 'rainbow', 'standard', 'standard']);
    expect(ids(sortCollection(save.collection, 'newest'))).toEqual(['c000005', 'c000004', 'c000003', 'c000002', 'c000001']);
  });

  it('does not change the list it was given', () => {
    const before = ids(save.collection);
    sortCollection(save.collection, 'finish');
    expect(ids(save.collection)).toEqual(before);
  });
});

describe('Card-Dex', () => {
  const dex = buildDex(save.collection);

  it('has one entry for every card of the set, owned or not', () => {
    expect(dex).toHaveLength(SET_SIZE);
    expect(dex.map((entry) => entry.card.number)).toEqual(Array.from({ length: SET_SIZE }, (_, i) => i + 1));
  });

  it('counts copies and picks the fanciest copy as the best one', () => {
    const first = dex[0];
    expect(first?.owned).toBe(2);
    expect(first?.best?.finish).toBe('prism');
    expect(dex[1]?.owned).toBe(0);
    expect(dex[1]?.best).toBeNull();
  });

  it('reports how many designs were found, overall and per character', () => {
    expect(dexProgress(dex)).toEqual({ found: 4, total: SET_SIZE });
    const byCharacter = dexProgressByCharacter(dex);
    expect(byCharacter.get('ichika')).toEqual({ found: 2, total: 12 });
    expect(byCharacter.get('nino')).toEqual({ found: 1, total: 12 });
    expect(byCharacter.get('yusuke')).toEqual({ found: 0, total: 3 });
  });

  it('prefers the first print when two copies have the same finish', () => {
    const twins = collect(['TQQ01-005', 'gold'], ['TQQ01-005', 'gold']);
    expect(bestCopy(twins.collection)?.serial).toBe(1);
    expect(bestCopy([])).toBeNull();
  });
});
