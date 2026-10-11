// The one running game and the one set of preferences of this page, plus the hooks screens use to read them.

import { useStore } from 'zustand';
import { createAi } from '../battle/ai';
import { legalActions } from '../battle/legal';
import { observe } from '../battle/observe';
import { recordBattle, type Payout } from '../battle/rewards';
import { ROSTER } from '../battle/roster';
import { CATALOG } from '../cards/catalog';
import { dayKeyOf } from '../domain/calendar';
import type { SaveGame } from '../domain/save';
import { createBattleSession, type SessionActions, type SessionState } from './battleSession';
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

const NO_PAYOUT: Payout = { yen: 0, base: 0, bonus: 0 };

/** The battle that is being played. It is not saved; its result is written into the save game when it ends. */
export const battleSession = createBattleSession({
  seed: () => crypto.randomUUID(),
  schedule: (run, delayMs) => {
    const timer = window.setTimeout(run, delayMs);
    return () => window.clearTimeout(timer);
  },
  settle: (outcome) =>
    gameStore.getState().transact((save) => {
      const recorded = recordBattle(save, outcome, dayKeyOf(new Date()), Date.now());
      return { save: recorded.save, value: recorded.payout };
    }) ?? NO_PAYOUT,
});

if (import.meta.env.DEV) {
  // For trying things in the browser console: __game.getState().change((save) => ...) edits the save, e.g. to make a copy look worn.
  Reflect.set(window, '__game', gameStore);
  // For looking at a battle in the browser console: __battle.session.getState().start(__battle.roster.opponents[0], { name: 'x', cards: __battle.roster.starters[0].cards, loaner: true })
  Reflect.set(window, '__battle', { session: battleSession, roster: ROSTER, legalActions, observe, createAi });
}

export function useBattle<T>(select: (state: SessionState & SessionActions) => T): T {
  return useStore(battleSession, select);
}

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
