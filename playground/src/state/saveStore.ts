// Where the save game is kept. The game only talks to this small interface, so the browser (IndexedDB), the desktop
// app and the tests can each bring their own place to keep it.

import { del, get, set } from 'idb-keyval';
import { parseSave, serializeSave, type SaveGame } from '../domain/save';

export interface SaveStore {
  /** The stored game, or null when there is none. Throws a SaveError when the stored data is damaged. */
  load(): Promise<SaveGame | null>;
  save(game: SaveGame): Promise<void>;
  clear(): Promise<void>;
  /** The stored text exactly as it is, even when it is damaged. Lets the player keep a copy before starting over. */
  readRaw(): Promise<string | null>;
}

const DEFAULT_KEY = 'tqq-save-v1';

/** Keeps the save in IndexedDB, as one checked text value (the same text a save file contains). */
export function createIdbSaveStore(knownCardIds: ReadonlySet<string>, key: string = DEFAULT_KEY): SaveStore {
  return {
    async load() {
      const text = await get<string>(key);
      return text === undefined ? null : parseSave(text, knownCardIds);
    },
    async save(game) {
      await set(key, serializeSave(game));
    },
    async clear() {
      await del(key);
    },
    async readRaw() {
      return (await get<string>(key)) ?? null;
    },
  };
}

/** Keeps the save in memory only. Used by tests and as a fallback when the browser blocks storage. */
export function createMemorySaveStore(knownCardIds: ReadonlySet<string>): SaveStore {
  let text: string | null = null;
  return {
    load() {
      return Promise.resolve(text === null ? null : parseSave(text, knownCardIds));
    },
    save(game) {
      text = serializeSave(game);
      return Promise.resolve();
    },
    clear() {
      text = null;
      return Promise.resolve();
    },
    readRaw() {
      return Promise.resolve(text);
    },
  };
}
