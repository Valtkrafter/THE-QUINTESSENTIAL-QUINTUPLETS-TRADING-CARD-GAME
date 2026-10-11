// The running game: the save in memory plus the work of keeping it on the device. Screens read it and call its actions;
// they never touch storage. Built by a factory so tests can bring their own store, clock and seed.

import { createStore, type StoreApi } from 'zustand/vanilla';
import { SaveError, newSaveGame, type SaveErrorCode, type SaveGame } from '../domain/save';
import type { SaveStore } from './saveStore';

/** `device`: saved in the browser. `memory`: the browser refused storage, so progress is lost when the page closes. */
export type Persistence = 'device' | 'memory';

export interface GameState {
  /** `damaged`: a stored game exists but cannot be read; nothing is overwritten until the player decides. */
  readonly phase: 'loading' | 'ready' | 'damaged';
  readonly save: SaveGame | null;
  /** Why the stored game cannot be read. */
  readonly problem: SaveErrorCode | null;
  readonly persistence: Persistence;
  /** True while the last attempt to write the save failed. */
  readonly writeFailed: boolean;
  /**
   * True once another window of the game has saved a game. This window then stops changing and writing, because what it holds
   * is older and would overwrite the newer game; the screen asks the player to reload.
   */
  readonly stale: boolean;
}

export interface GameActions {
  /** Loads the stored game, or starts a new one. Safe to call more than once. */
  start(): Promise<void>;
  /** Applies a pure change to the save and stores the result. */
  change(update: (save: SaveGame) => SaveGame): void;
  /**
   * Runs a rule that gives back a result together with the new save, stores the new save and returns the result.
   * When the rule throws nothing changes. Returns undefined while no game is loaded.
   */
  transact<T>(rule: (save: SaveGame) => { readonly save: SaveGame; readonly value: T }): T | undefined;
  /** Swaps in another save (an imported file) and stores it. */
  replace(save: SaveGame): void;
  /** Throws the stored game away and begins a new one. */
  startOver(): Promise<void>;
  /** The stored text of a damaged game, so the player can keep a copy. */
  damagedText(): Promise<string | null>;
  /** Resolves when everything changed so far has been written (or has failed). */
  settled(): Promise<void>;
}

export type GameStore = StoreApi<GameState & GameActions>;

/** How windows of the game on one device tell each other that they saved. */
export interface WindowSync {
  /** This window has written the save. */
  announce(): void;
  /** Calls `handler` whenever another window has written the save. */
  onOtherSaved(handler: () => void): void;
}

export interface GameDeps {
  readonly store: SaveStore;
  /** Used when the main store cannot be opened at all. */
  readonly fallback: () => SaveStore;
  readonly now: () => number;
  /** A fresh seed for a new game. */
  readonly seed: () => string;
  /** Without it a second window is not noticed (the game then simply works as it did). */
  readonly sync?: WindowSync;
}

export function createGameStore(deps: GameDeps): GameStore {
  let active = deps.store;
  let starting: Promise<void> | null = null;
  let pending: SaveGame | null = null;
  let flushing: Promise<void> | null = null;

  return createStore<GameState & GameActions>()((set, get) => {
    async function writePending(): Promise<void> {
      while (pending !== null) {
        const next = pending;
        pending = null;
        try {
          await active.save(next);
          set({ writeFailed: false });
          deps.sync?.announce();
        } catch {
          set({ writeFailed: true });
        }
      }
      flushing = null;
    }

    // Two windows of the game on one device each keep their own copy of the save in memory, and the later write wins. So a window
    // that hears of another one's write stops: its game is older, and writing it would throw the newer one away.
    deps.sync?.onOtherSaved(() => {
      if (get().phase === 'ready') {
        pending = null;
        set({ stale: true });
      }
    });

    function persist(save: SaveGame): void {
      pending = save;
      flushing ??= writePending();
    }

    async function begin(): Promise<void> {
      let loaded: SaveGame | null = null;
      let persistence: Persistence = 'device';
      try {
        loaded = await active.load();
      } catch (error) {
        if (error instanceof SaveError) {
          set({ phase: 'damaged', problem: error.code });
          return;
        }
        active = deps.fallback();
        persistence = 'memory';
      }
      const save = loaded ?? newSaveGame(deps.seed(), deps.now());
      set({ phase: 'ready', save, problem: null, persistence });
      if (loaded === null) {
        persist(save);
      }
    }

    return {
      phase: 'loading',
      save: null,
      problem: null,
      persistence: 'device',
      writeFailed: false,
      stale: false,

      start() {
        starting ??= begin();
        return starting;
      },

      change(update) {
        const { phase, save, stale } = get();
        if (phase !== 'ready' || save === null || stale) {
          return;
        }
        const next = update(save);
        set({ save: next });
        persist(next);
      },

      transact(rule) {
        const { phase, save, stale } = get();
        if (phase !== 'ready' || save === null || stale) {
          return undefined;
        }
        const result = rule(save);
        set({ save: result.save });
        persist(result.save);
        return result.value;
      },

      replace(save) {
        if (get().stale) {
          return;
        }
        set({ phase: 'ready', save, problem: null });
        persist(save);
      },

      async startOver() {
        if (get().stale) {
          return;
        }
        try {
          await active.clear();
        } catch {
          // Nothing to clear when storage is unavailable; the new game is written below.
        }
        const save = newSaveGame(deps.seed(), deps.now());
        set({ phase: 'ready', save, problem: null });
        persist(save);
      },

      async damagedText() {
        try {
          return await active.readRaw();
        } catch {
          return null;
        }
      },

      async settled() {
        while (flushing !== null) {
          await flushing;
        }
      },
    };
  });
}
