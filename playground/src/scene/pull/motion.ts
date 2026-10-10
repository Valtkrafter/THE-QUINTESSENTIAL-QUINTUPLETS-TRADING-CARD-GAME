// The curves of the pull show: the needle that falls into the gate, the dive, how a card flips and where it sits in each
// phase. Plain maths, so the shape of every movement (starts and ends where it should, never runs backwards) can be tested.

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

// --- The cinematic: storm, needle, gate ----------------------------------------------------------------------------

/** Where the burst of light is centred: just in front of the middle of the screen. */
export const IMPACT_POINT: Vector3 = new Vector3(0.1, 0.35, 2.6);

const N0 = new Vector3(-5.0, -3.0, 5.0);
const N1 = new Vector3(-3.2, -1.9, -1.0);
const N2 = new Vector3(-1.0, -0.4, -10.0);
const N3 = new Vector3(0.0, 0.27, -34.0);

/**
 * A point on the path of the needle: it starts close to the camera at the lower left (off screen) and falls away into the
 * gate in the middle of the screen, so its trail seems to rush towards the viewer.
 */
export function needlePath(p: number, out: Vector3 = new Vector3()): Vector3 {
  const t = clamp01(p);
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return out.set(
    a * N0.x + b * N1.x + c * N2.x + d * N3.x,
    a * N0.y + b * N1.y + c * N2.y + d * N3.y,
    a * N0.z + b * N1.z + c * N2.z + d * N3.z,
  );
}

/** Where the flight stops and the needle hangs, for the packs with the five threads. */
const HANG_AT = 0.72;
const HANG_PATH = 0.82;

/**
 * Turns the time of the flight (0..1) into a position on the needle's path (0..1). The needle is fast at first and glides
 * towards the gate. With `hang` it stops close to the end so the threads can tighten around it, and then plunges in.
 */
export function needleProgress(time: number, hang: boolean): number {
  const t = clamp01(time);
  if (!hang) {
    return 1 - (1 - t) ** 1.8;
  }
  if (t < HANG_AT) {
    return HANG_PATH * (1 - (1 - t / HANG_AT) ** 1.8);
  }
  return HANG_PATH + (1 - HANG_PATH) * easeInCubic((t - HANG_AT) / (1 - HANG_AT));
}

/** Where the gate's own clock stands while the needle hangs: calm and glowing, the dive still ahead. */
const GATE_HANG = 0.64;

/**
 * The gate runs on its own clock. Without the hang it follows the flight. With the hang it waits in its calm pose while the
 * needle hangs and the threads tighten, and the whole dive and the white-out happen in the plunge at the end.
 */
export function gateTime(u: number, hang: boolean): number {
  const t = clamp01(u);
  if (!hang) {
    return t;
  }
  return t < HANG_AT ? t * (GATE_HANG / HANG_AT) : GATE_HANG + (1 - GATE_HANG) * ((t - HANG_AT) / (1 - HANG_AT));
}

/** How visible the gate is (0 = not there, 1 = fully drawn). */
export function gateOpen(u: number): number {
  return smoothstep(0.05, 0.36, u);
}

/** How brightly the clouds of the gate glow. */
export function gateEnergy(u: number): number {
  return smoothstep(0.28, 0.92, u);
}

/**
 * How brightly the gate shines. It rises with the energy, and during the final rush, when the ring flies outwards past the
 * edges of the screen, it dims again, so the white-out in the middle has room to be seen.
 */
export function gateGlow(u: number): number {
  return gateEnergy(u) * (1 - 0.65 * smoothstep(0.8, 1, u));
}

/** The dive into the gate: the ring grows from small to normal, then rushes outwards past the screen. */
export function gateZoom(u: number): number {
  return 0.5 + 0.5 * smoothstep(0, 0.62, u) + 2.7 * easeInCubic(smoothstep(0.66, 1, u));
}

/** The feeling of speed: thin lines flying away from the middle. */
export function speedLines(u: number): number {
  return smoothstep(0.04, 0.7, u);
}

/** Radial blur towards the middle while the dive is fast. */
export function diveBlur(u: number): number {
  return smoothstep(0.7, 1, u);
}

/** The white-out that builds up in the last part of the flight. */
export function whiteOut(u: number): number {
  return smoothstep(0.84, 0.995, u);
}

/** The storm at the start: the camera falls towards its eye. */
export function stormZoom(u: number): number {
  return 1 + 3.4 * easeInCubic(clamp01(u));
}

/** The storm fades to black in the last part of the intro. */
export function stormFade(u: number): number {
  return 1 - smoothstep(0.78, 1, u);
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
