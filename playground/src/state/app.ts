// The one running game and the one set of preferences of this page, plus the hooks screens use to read them.

import { useStore } from 'zustand';
import { CATALOG } from '../cards/catalog';
import type { SaveGame } from '../domain/save';
import { createGameStore, type GameActions, type GameState } from './gameStore';
import { createIdbPreferenceStorage, createPreferencesStore, type Preferences, type PreferencesState } from './preferences';
import { createIdbSaveStore, createMemorySaveStore } from './saveStore';

export const KNOWN_CARD_IDS: ReadonlySet<string> = new Set(CATALOG.map((card) => card.id));

export const gameStore = createGameStore({
  store: createIdbSaveStore(KNOWN_CARD_IDS),
  fallback: () => createMemorySaveStore(KNOWN_CARD_IDS),
  now: () => Date.now(),
  seed: () => crypto.randomUUID(),
});

export const preferencesStore = createPreferencesStore(createIdbPreferenceStorage());

export function useGame<T>(select: (state: GameState & GameActions) => T): T {
  return useStore(gameStore, select);
}

/** The save of a running game. Only call it below the gate that waits for the game to load. */
export function useSave(): SaveGame {
  const save = useGame((state) => state.save);
  if (save === null) {
    throw new Error('The game has not loaded yet.');
  }
  return save;
}

export function usePreferences(): Preferences {
  return useStore(preferencesStore, (state: PreferencesState) => state.preferences);
}
