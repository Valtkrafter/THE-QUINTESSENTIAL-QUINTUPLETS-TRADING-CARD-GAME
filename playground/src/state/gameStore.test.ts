import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { addOwnedCard, newSaveGame, parseSave, serializeSave, type SaveGame } from '../domain/save';
import { createGameStore } from './gameStore';
import { createMemorySaveStore, type SaveStore } from './saveStore';

const KNOWN = new Set(CATALOG.map((card) => card.id));
const NOW = 1_760_000_000_000;

/** A store that keeps its text in a variable we can inspect and damage. */
function rawStore(initial: string | null): SaveStore & { text: string | null } {
  const store = {
    text: initial,
    load: () => Promise.resolve(store.text === null ? null : parseSave(store.text, KNOWN)),
    save: (game: SaveGame) => {
      store.text = serializeSave(game);
      return Promise.resolve();
    },
    clear: () => {
      store.text = null;
      return Promise.resolve();
    },
    readRaw: () => Promise.resolve(store.text),
  };
  return store;
}

function deps(store: SaveStore, fallback: SaveStore = createMemorySaveStore(KNOWN)) {
  return { store, fallback: () => fallback, now: () => NOW, seed: () => 'seed' };
}

describe('game store', () => {
  it('starts a new game when nothing is stored, and stores it', async () => {
    const store = rawStore(null);
    const game = createGameStore(deps(store));
    expect(game.getState().phase).toBe('loading');
    await game.getState().start();
    await game.getState().settled();
    expect(game.getState().phase).toBe('ready');
    expect(game.getState().save).toEqual(newSaveGame('seed', NOW));
    expect(store.text).toBe(serializeSave(newSaveGame('seed', NOW)));
  });

  it('loads the stored game instead of starting a new one', async () => {
    const stored = addOwnedCard(newSaveGame('kept', NOW), 'TQQ01-003', 'gold', 'pack', NOW).save;
    const game = createGameStore(deps(rawStore(serializeSave(stored))));
    await game.getState().start();
    expect(game.getState().save).toEqual(stored);
  });

  it('applies changes and writes the latest one', async () => {
    const store = rawStore(null);
    const game = createGameStore(deps(store));
    await game.getState().start();
    game.getState().change((save) => addOwnedCard(save, 'TQQ01-010', 'rainbow', 'pack', NOW).save);
    game.getState().change((save) => addOwnedCard(save, 'TQQ01-011', 'sparkle', 'pack', NOW).save);
    await game.getState().settled();
    expect(game.getState().save?.collection).toHaveLength(2);
    const reloaded = createGameStore(deps(store));
    await reloaded.getState().start();
    expect(reloaded.getState().save).toEqual(game.getState().save);
  });

  it('returns the result of a rule and stores its save, or changes nothing when the rule throws', async () => {
    const game = createGameStore(deps(rawStore(null)));
    expect(game.getState().transact(() => ({ save: newSaveGame('x', NOW), value: 1 }))).toBeUndefined();
    await game.getState().start();
    const value = game.getState().transact((save) => ({ save: addOwnedCard(save, 'TQQ01-030', 'gold', 'pack', NOW).save, value: 'done' }));
    expect(value).toBe('done');
    expect(game.getState().save?.collection).toHaveLength(1);
    expect(() =>
      game.getState().transact(() => {
        throw new Error('rule failed');
      }),
    ).toThrow('rule failed');
    expect(game.getState().save?.collection).toHaveLength(1);
  });

  it('ignores changes before the game is loaded', () => {
    const game = createGameStore(deps(rawStore(null)));
    game.getState().change((save) => ({ ...save, player: { yen: 5 } }));
    expect(game.getState().save).toBeNull();
  });

  it('keeps a damaged save untouched until the player decides', async () => {
    const store = rawStore('{"format":"tqq-save","checksum":"00000000","data":"{}"}');
    const game = createGameStore(deps(store));
    await game.getState().start();
    expect(game.getState().phase).toBe('damaged');
    expect(game.getState().problem).toBe('damaged');
    expect(await game.getState().damagedText()).toBe(store.text);
    expect(store.text).not.toBeNull();
    await game.getState().startOver();
    await game.getState().settled();
    expect(game.getState().phase).toBe('ready');
    expect(store.text).toBe(serializeSave(newSaveGame('seed', NOW)));
  });

  it('carries on in memory when the browser refuses storage', async () => {
    const broken: SaveStore = {
      load: () => Promise.reject(new Error('IndexedDB is not available')),
      save: () => Promise.reject(new Error('IndexedDB is not available')),
      clear: () => Promise.reject(new Error('IndexedDB is not available')),
      readRaw: () => Promise.reject(new Error('IndexedDB is not available')),
    };
    const game = createGameStore(deps(broken));
    await game.getState().start();
    await game.getState().settled();
    expect(game.getState().phase).toBe('ready');
    expect(game.getState().persistence).toBe('memory');
    expect(game.getState().writeFailed).toBe(false);
  });

  it('reports a failed write without losing the game in memory', async () => {
    let failing = false;
    const flaky: SaveStore = {
      ...createMemorySaveStore(KNOWN),
      save: () => (failing ? Promise.reject(new Error('disk full')) : Promise.resolve()),
    };
    const game = createGameStore(deps(flaky));
    await game.getState().start();
    await game.getState().settled();
    failing = true;
    game.getState().change((save) => addOwnedCard(save, 'TQQ01-020', 'standard', 'pack', NOW).save);
    await game.getState().settled();
    expect(game.getState().writeFailed).toBe(true);
    expect(game.getState().save?.collection).toHaveLength(1);
    failing = false;
    game.getState().change((save) => addOwnedCard(save, 'TQQ01-021', 'standard', 'pack', NOW).save);
    await game.getState().settled();
    expect(game.getState().writeFailed).toBe(false);
  });

  it('starts only once when asked twice', async () => {
    let loads = 0;
    const counting: SaveStore = { ...createMemorySaveStore(KNOWN), load: () => { loads += 1; return Promise.resolve(null); } };
    const game = createGameStore(deps(counting));
    await Promise.all([game.getState().start(), game.getState().start()]);
    expect(loads).toBe(1);
  });
});
