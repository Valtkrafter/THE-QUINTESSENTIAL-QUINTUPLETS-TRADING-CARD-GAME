import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { newSaveGame } from '../domain/save';
import { createMemorySaveStore } from './saveStore';

const KNOWN = new Set(CATALOG.map((card) => card.id));
const NOW = 1_760_000_000_000;

describe('save store', () => {
  it('keeps, loads and clears a game', async () => {
    const store = createMemorySaveStore(KNOWN);
    expect(await store.load()).toBeNull();
    const game = newSaveGame('store', NOW);
    await store.save(game);
    expect(await store.load()).toEqual(game);
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
