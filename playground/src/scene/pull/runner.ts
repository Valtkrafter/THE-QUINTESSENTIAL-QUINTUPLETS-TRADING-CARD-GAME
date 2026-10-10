// Runs the director for one show and tells everyone who is interested what happens: the scene (every frame), the screen
// (when the phase changes) and the sound (on events). The listeners are plain functions, so a test can play a whole show.

import { advance, skipAll, startState, tap, type DirectorEvent, type DirectorState, type Phase, type PullMode, type ShowPack } from './director';

/** The part of the state the screen needs. It changes only when the phase, the pack or the card changes. */
export interface PullSnapshot {
  readonly pack: number;
  readonly phase: Phase;
  readonly card: number;
}

export type PullListener = (event: DirectorEvent) => void;

export class PullRunner {
  readonly packs: readonly ShowPack[];
  readonly mode: PullMode;
  #state: DirectorState;
  #snapshot: PullSnapshot;
  readonly #subscribers = new Set<() => void>();
  readonly #listeners = new Set<PullListener>();

  constructor(packs: readonly ShowPack[], mode: PullMode) {
    this.packs = packs;
    this.mode = mode;
    this.#state = startState(mode);
    this.#snapshot = { pack: this.#state.pack, phase: this.#state.phase, card: this.#state.card };
  }

  get state(): DirectorState {
    return this.#state;
  }

  /** Lets time pass. Call it once per frame with the frame's duration. */
  step(seconds: number): void {
    this.#apply(advance(this.packs, this.mode, this.#state, seconds));
  }

  /** The player tapped the screen. */
  tap(): void {
    this.#apply(tap(this.packs, this.mode, this.#state));
  }

  /** The player wants to see the result now. */
  skip(): void {
    this.#apply(skipAll(this.#state));
  }

  /** For `useSyncExternalStore`: called when the phase, pack or card changes. */
  subscribe = (listener: () => void): (() => void) => {
    this.#subscribers.add(listener);
    return () => {
      this.#subscribers.delete(listener);
    };
  };

  getSnapshot = (): PullSnapshot => this.#snapshot;

  /** Listens to every event of the show (phase changes, the impact, the middle of a flip). */
  onEvent(listener: PullListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #apply(result: { readonly state: DirectorState; readonly events: readonly DirectorEvent[] }): void {
    this.#state = result.state;
    const { pack, phase, card } = result.state;
    if (pack !== this.#snapshot.pack || phase !== this.#snapshot.phase || card !== this.#snapshot.card) {
      this.#snapshot = { pack, phase, card };
      for (const subscriber of this.#subscribers) {
        subscriber();
      }
    }
    for (const event of result.events) {
      for (const listener of this.#listeners) {
        try {
          listener(event);
        } catch (error) {
          // A broken listener (a sound, an effect) must not stop the show.
          console.error('A listener of the pull show failed.', error);
        }
      }
    }
  }
}
