// Which introduction is running right now (none, or the one of a tab). The menu reads it to shut the other tabs.

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { preferencesStore } from '../../state/app';
import type { TutorialTab } from '../../state/preferences';

export interface TutorialState {
  readonly active: TutorialTab | null;
}

export const tutorialStore = createStore<TutorialState>()(() => ({ active: null }));

export function useActiveTutorial(): TutorialTab | null {
  return useStore(tutorialStore, (state) => state.active);
}

/** The key under which a browser may switch the introduction off (for tests of the rest of the game). */
export const TUTORIAL_SWITCH = 'tqq-tutorial';

/** The introduction is on, except where this browser switched it off with `localStorage['tqq-tutorial'] = 'off'`. */
export function tutorialEnabled(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_SWITCH) !== 'off';
  } catch {
    return true;
  }
}

/** Starts all introductions again, from the Packs one (a tool for the development version). */
export function restartTutorials(): void {
  tutorialStore.setState({ active: null });
  preferencesStore.getState().update({ tutorialDone: [], tutorialSteps: [] });
}
