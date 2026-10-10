// Notices when the show runs too slowly, so the glowing background can be drawn a little smaller (on a weak graphics chip a
// big picture full of clouds may not reach a smooth frame rate). Plain numbers in, one decision out, so it can be tested.

/** The fastest picture size that is still worth drawing, as a share of the full size. */
export const MIN_RESOLUTION_SCALE = 0.5;
/** How much smaller the picture gets each time the show is found to be too slow. */
export const RESOLUTION_STEP = 0.125;

export class SpeedMeter {
  readonly #slowSeconds: number;
  readonly #window: number;
  readonly #cooldownFrames: number;
  #sum = 0;
  #count = 0;
  #cooldown = 0;

  /**
   * @param slowSeconds the average frame time above which the show counts as too slow
   * @param window how many frames are looked at before a decision is made
   * @param cooldownFrames how many frames to wait after a decision, so the effect of a change can show
   */
  constructor(slowSeconds = 0.028, window = 45, cooldownFrames = 90) {
    this.#slowSeconds = slowSeconds;
    this.#window = window;
    this.#cooldownFrames = cooldownFrames;
  }

  /** Feeds one frame (its duration in seconds). Returns true when the last frames were too slow. */
  push(delta: number): boolean {
    if (delta > 0.25) {
      // A pause (the tab was hidden, the window was moved) says nothing about how fast the show can run.
      return false;
    }
    if (this.#cooldown > 0) {
      this.#cooldown -= 1;
      return false;
    }
    this.#sum += delta;
    this.#count += 1;
    if (this.#count < this.#window) {
      return false;
    }
    const slow = this.#sum / this.#count > this.#slowSeconds;
    this.#sum = 0;
    this.#count = 0;
    if (slow) {
      this.#cooldown = this.#cooldownFrames;
    }
    return slow;
  }
}

/** The size to draw at after one more step down, never below the minimum. */
export function smallerScale(scale: number): number {
  return Math.max(MIN_RESOLUTION_SCALE, scale - RESOLUTION_STEP);
}
