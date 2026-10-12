// Moves the parts of a pack while the player tears it open. It works on plain DOM elements and knows nothing about React:
// the component hands it the elements once and forwards the pointer events. The shape of the tear is `tearShape.ts`.

import { TEAR_LINE, dragProgress, flapAngle, releaseTarget, tearShape } from './tearShape';

export interface TearParts {
  /** The pack that is dragged on. Its width tells how far a swipe has to go. */
  readonly box: HTMLElement;
  readonly rest: HTMLElement;
  readonly strip: HTMLElement;
  readonly flap: HTMLElement;
  readonly glow: HTMLElement;
  readonly beam: HTMLElement;
  /** The white screen of the moment the pack is open. */
  readonly flash: HTMLElement;
}

export interface TearCallbacks {
  /** The tear begins: the sound of foil. */
  readonly onRip: () => void;
  /** The screen is white: the show goes on behind it. */
  readonly onOpen: () => void;
  /** The white has died down. */
  readonly onGone: () => void;
}

/** Fraction of the pack's width that a swipe has to cover to tear the whole top. */
const SWIPE_SPAN = 0.78;
/** A movement smaller than this many pixels is a tap, not a swipe. */
const TAP_DISTANCE = 7;

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

type Stage = 'waiting' | 'tearing' | 'opening';

interface Drag {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  moved: boolean;
}

export class PackTearController {
  readonly #parts: TearParts;
  readonly #callbacks: TearCallbacks;
  /** Reduced motion: the same steps, much shorter, and the parts do not fly. */
  readonly #speed: number;
  #stage: Stage = 'waiting';
  #progress = 0;
  #frame: number | null = null;
  #ripped = false;
  #drag: Drag | null = null;
  #alive = true;

  constructor(parts: TearParts, callbacks: TearCallbacks, reducedMotion: boolean) {
    this.#parts = parts;
    this.#callbacks = callbacks;
    this.#speed = reducedMotion ? 0.35 : 1;
    this.paint(0);
  }

  get progress(): number {
    return this.#progress;
  }

  get stage(): Stage {
    return this.#stage;
  }

  /** Puts the parts of the pack where a tear of `p` (0..1) leaves them. */
  paint(p: number): void {
    this.#progress = p;
    const shape = tearShape(p);
    const { rest, strip, flap, glow, beam } = this.#parts;
    rest.style.clipPath = shape.rest;
    strip.style.clipPath = shape.strip;
    flap.style.clipPath = shape.flap;
    flap.style.transformOrigin = shape.pivot;
    flap.style.transform = p === 0 ? 'none' : `rotate(${flapAngle(p).toFixed(2)}deg) translateY(${(-p * 3.5).toFixed(2)}%)`;
    const reach = (p * 100).toFixed(2);
    glow.style.clipPath = `polygon(0% ${TEAR_LINE - 4}%, ${reach}% ${TEAR_LINE - 4}%, ${reach}% ${TEAR_LINE + 3}%, 0% ${TEAR_LINE + 3}%)`;
    glow.style.opacity = String(Math.min(1, p * 2.4));
    beam.style.width = `${reach}%`;
    beam.style.opacity = String(Math.min(1, p * 1.8));
  }

  /** Tears the pack from where the tear is now to the end by itself (a tap, a key, or a swipe let go past the middle). */
  open(): void {
    if (this.#stage === 'opening') {
      return;
    }
    this.#stage = 'tearing';
    this.#rip();
    this.#tween(1, (0.25 + (1 - this.#progress) * 0.55) * 1000 * this.#speed, () => this.#finish());
  }

  pointerDown(id: number, x: number, y: number): boolean {
    if (this.#stage === 'opening' || this.#drag !== null) {
      return false;
    }
    this.#stopFrame();
    this.#drag = { id, startX: x, startY: y, moved: false };
    this.#stage = 'tearing';
    this.#parts.box.setAttribute('data-dragging', 'true');
    return true;
  }

  pointerMove(id: number, x: number, y: number): void {
    const drag = this.#drag;
    if (drag === null || drag.id !== id || this.#stage === 'opening') {
      return;
    }
    if (Math.hypot(x - drag.startX, y - drag.startY) > TAP_DISTANCE) {
      drag.moved = true;
    }
    const p = dragProgress(drag.startX, x, this.#parts.box.getBoundingClientRect().width * SWIPE_SPAN);
    this.paint(p);
    if (p > 0.03) {
      this.#rip();
    }
    if (p >= 1) {
      this.#drag = null;
      this.#parts.box.removeAttribute('data-dragging');
      this.#finish();
    }
  }

  pointerUp(id: number): void {
    const drag = this.#drag;
    if (drag === null || drag.id !== id) {
      return;
    }
    this.#drag = null;
    this.#parts.box.removeAttribute('data-dragging');
    if (!drag.moved || releaseTarget(this.#progress) === 1) {
      // A tap, or a swipe that went far enough: the pack opens by itself.
      this.open();
    } else {
      this.#fallBack(260);
    }
  }

  pointerCancel(): void {
    if (this.#drag !== null) {
      this.#drag = null;
      this.#parts.box.removeAttribute('data-dragging');
      this.#fallBack(200);
    }
  }

  dispose(): void {
    this.#alive = false;
    this.#stopFrame();
  }

  // --- Inside ------------------------------------------------------------------------------------------------------

  /** Let go too early: the strip falls back and the pack can be torn again. */
  #fallBack(ms: number): void {
    this.#tween(0, ms * this.#speed, () => {
      this.#stage = 'waiting';
      this.#ripped = false;
    });
  }

  #rip(): void {
    if (!this.#ripped) {
      this.#ripped = true;
      this.#callbacks.onRip();
    }
  }

  #stopFrame(): void {
    if (this.#frame !== null) {
      window.cancelAnimationFrame(this.#frame);
      this.#frame = null;
    }
  }

  /** Moves the tear from where it is to `to` (0 or 1) in `ms`, then calls `done`. */
  #tween(to: number, ms: number, done: () => void): void {
    this.#stopFrame();
    const from = this.#progress;
    const started = performance.now();
    const step = (now: number): void => {
      if (!this.#alive) {
        return;
      }
      const t = ms <= 0 ? 1 : Math.min(1, (now - started) / ms);
      this.paint(from + (to - from) * easeInOut(t));
      if (t < 1) {
        this.#frame = window.requestAnimationFrame(step);
      } else {
        this.#frame = null;
        done();
      }
    };
    this.#frame = window.requestAnimationFrame(step);
  }

  /** Runs one animation on an element, if the browser can animate; null when it cannot. */
  #fly(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
    return typeof element.animate === 'function' ? element.animate(keyframes, { fill: 'forwards', ...options }) : null;
  }

  /** The top is torn off: the parts fly away, the screen turns white, the show begins, the white fades. */
  #finish(): void {
    if (this.#stage === 'opening') {
      return;
    }
    this.#stage = 'opening';
    this.#stopFrame();
    this.paint(1);
    const s = this.#speed;
    const { flap, strip, rest, glow, beam, flash } = this.#parts;
    this.#fly(flap, [{ opacity: 1 }, { transform: 'translate(-30%, -140%) rotate(-70deg)', opacity: 0 }], { duration: 420 * s, easing: 'ease-in' });
    this.#fly(strip, [{ opacity: 1 }, { transform: 'translate(40%, -150%) rotate(60deg)', opacity: 0 }], { duration: 420 * s, easing: 'ease-in' });
    this.#fly(rest, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(16%) scale(1.06)', opacity: 0 }], { duration: 560 * s, delay: 140 * s, easing: 'ease-in' });
    this.#fly(glow, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 * s, delay: 200 * s });
    this.#fly(beam, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(6)', opacity: 0.2 }], { duration: 480 * s, easing: 'ease-in' });
    const white = this.#fly(flash, [{ opacity: 0 }, { opacity: 1 }], { duration: 420 * s, delay: 140 * s, easing: 'ease-in' });

    const whiteReached = (): void => {
      if (!this.#alive) {
        return;
      }
      this.#callbacks.onOpen();
      const fade = this.#fly(flash, [{ opacity: 1 }, { opacity: 0 }], { duration: 800 * s, easing: 'ease-out' });
      if (fade === null) {
        this.#callbacks.onGone();
        return;
      }
      void fade.finished.then(
        () => {
          if (this.#alive) {
            this.#callbacks.onGone();
          }
        },
        () => undefined,
      );
    };
    if (white === null) {
      whiteReached();
    } else {
      void white.finished.then(whiteReached, () => undefined);
    }
  }
}
