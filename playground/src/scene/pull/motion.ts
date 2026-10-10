// The curves of the pull show: the path of the shooting star, how a card flips and where it sits in each phase. Plain
// maths, so the shape of every movement (starts and ends where it should, never runs backwards) can be tested.

import { Vector3 } from 'three';
import type { Phase } from './director';

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(from: number, to: number, value: number): number {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Overshoots a little before it settles. */
export function easeOutBack(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

// --- The shooting star -------------------------------------------------------------------------------------------

const P0 = new Vector3(-10.5, 7.8, -17);
const P1 = new Vector3(-5.2, 6.4, -8.5);
const P2 = new Vector3(-1.6, 2.4, 0.5);
/** Where the star lands: just in front of the middle of the screen. */
export const IMPACT_POINT: Vector3 = new Vector3(0.1, 0.35, 2.6);

/** A point on the star's curved path, from far away at the top left (0) to the landing point (1). */
export function starPath(p: number, out: Vector3 = new Vector3()): Vector3 {
  const t = clamp01(p);
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return out.set(
    a * P0.x + b * P1.x + c * P2.x + d * IMPACT_POINT.x,
    a * P0.y + b * P1.y + c * P2.y + d * IMPACT_POINT.y,
    a * P0.z + b * P1.z + c * P2.z + d * IMPACT_POINT.z,
  );
}

/** Where the flight stops speeding up and hangs in the air, for the packs with the five threads. */
const HANG_AT = 0.72;
const HANG_PATH = 0.86;

/**
 * Turns the time of the flight (0..1) into a position on the path (0..1). The star speeds up as it falls. With `hang` it
 * pauses close to the end, so the threads can tighten around it, and then plunges.
 */
export function flightProgress(time: number, hang: boolean): number {
  const t = clamp01(time);
  if (!hang) {
    return t ** 2.1;
  }
  if (t < HANG_AT) {
    return HANG_PATH * (t / HANG_AT) ** 1.6;
  }
  return HANG_PATH + (1 - HANG_PATH) * easeInCubic((t - HANG_AT) / (1 - HANG_AT));
}

// --- The card ---------------------------------------------------------------------------------------------------

/**
 * How far a flip has turned (0 = face down, 1 = face up) at time `u` (0..1). Plain cards turn smoothly. With `drama` the
 * card winds up slowly, almost stops on its edge, and then snaps over.
 */
export function flipAngle(u: number, drama: number): number {
  const t = clamp01(u);
  const plain = easeInOutCubic(t);
  let dramatic: number;
  if (t < 0.55) {
    dramatic = 0.46 * (0.5 - 0.5 * Math.cos(Math.PI * (t / 0.55)));
  } else if (t < 0.68) {
    dramatic = 0.46 + 0.03 * ((t - 0.55) / 0.13);
  } else {
    dramatic = 0.49 + 0.51 * easeOutCubic((t - 0.68) / 0.32);
  }
  const mix = clamp01(drama);
  return plain * (1 - mix) + dramatic * mix;
}

export interface CardPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
  /** Turn around the vertical axis in radians: π shows the back of the card, 0 shows the front. */
  readonly turn: number;
  readonly roll: number;
}

export const CARD_HOME_Y = 0.45;
/** The card is shown a little larger than in the inspect view: it is the hero of the screen. */
export const CARD_SHOW_SCALE = 1.2;

const HIDDEN: CardPose = { x: 0, y: -9, z: -4, scale: 0.5, turn: Math.PI, roll: 0 };

/** Where the shown card is in a phase. `u` is the progress through the phase, `drama` (0..1) how theatrical the flip is. */
export function cardPose(phase: Phase, u: number, drama: number): CardPose {
  const t = clamp01(u);
  switch (phase) {
    case 'enter': {
      const e = easeOutBack(t);
      return { x: 0, y: -6 + (CARD_HOME_Y + 6) * e, z: -4 + 4 * e, scale: (0.62 + 0.38 * e) * CARD_SHOW_SCALE, turn: Math.PI, roll: 0.1 * (1 - t) };
    }
    case 'flip': {
      const a = flipAngle(t, drama);
      const lift = Math.sin(Math.PI * a);
      return { x: 0, y: CARD_HOME_Y, z: lift * (0.7 + 0.8 * drama), scale: (1 + lift * 0.1) * CARD_SHOW_SCALE, turn: Math.PI * (1 - a), roll: 0 };
    }
    case 'show':
      return { x: 0, y: CARD_HOME_Y, z: 0, scale: CARD_SHOW_SCALE, turn: 0, roll: 0 };
    case 'exit': {
      const e = easeInCubic(t);
      return { x: 0, y: CARD_HOME_Y - 7 * e, z: e * 1.2, scale: (1 - 0.65 * e) * CARD_SHOW_SCALE, turn: 0, roll: -0.18 * e };
    }
    default:
      return HIDDEN;
  }
}
