// The motion of a card in a grid, as plain numbers: how far it tilts toward the pointer (or sways on its own) and how
// often it needs a new picture. The numbers match the card of the inspect view (cardRig.ts), so a card looks alike in both.

import { createSpring, stepSpring, type Spring, type SpringConfig } from './spring';

/** The largest tilt of a card, in radians (the same as in the inspect view at tilt 1). */
export const MAX_TILT = 0.32;
const TILT_SPRING: SpringConfig = { stiffness: 120, damping: 14 };
const HOVER_SPRING: SpringConfig = { stiffness: 160, damping: 24 };

export interface TileMotion {
  readonly tiltX: Spring;
  readonly tiltY: Spring;
  readonly hover: Spring;
  /** Pointer position over the card, -1 to 1 on both axes (y up, like the card). */
  pointerX: number;
  pointerY: number;
  hovering: boolean;
}

export function createMotion(): TileMotion {
  return { tiltX: createSpring(), tiltY: createSpring(), hover: createSpring(), pointerX: 0, pointerY: 0, hovering: false };
}

export interface MotionInput {
  readonly delta: number;
  readonly time: number;
  /** Shifts the sway so neighbouring cards do not move in step. */
  readonly phase: number;
  /** The slow sway of a card nobody touches. */
  readonly sway: boolean;
}

/** Where the tilt springs are heading: toward the pointer while hovered, else a slow sway or nothing. */
export function tiltTarget(motion: Pick<TileMotion, 'hovering' | 'pointerX' | 'pointerY'>, input: Pick<MotionInput, 'time' | 'phase' | 'sway'>): { readonly x: number; readonly y: number } {
  if (motion.hovering) {
    // Press-down feel: the side under the pointer dips away from the viewer.
    return { x: -motion.pointerY * MAX_TILT, y: motion.pointerX * MAX_TILT };
  }
  if (input.sway) {
    return { x: Math.sin(input.time * 0.7 + input.phase) * MAX_TILT * 0.28, y: Math.cos(input.time * 0.55 + input.phase * 1.7) * MAX_TILT * 0.4 };
  }
  return { x: 0, y: 0 };
}

export function stepMotion(motion: TileMotion, input: MotionInput): void {
  const target = tiltTarget(motion, input);
  stepSpring(motion.tiltX, target.x, TILT_SPRING, input.delta);
  stepSpring(motion.tiltY, target.y, TILT_SPRING, input.delta);
  stepSpring(motion.hover, motion.hovering ? 1 : 0, HOVER_SPRING, input.delta);
}

/** True while the card still moves (so the picture has to be redrawn). */
export function isMoving(motion: TileMotion): boolean {
  const spring = (value: Spring, target: number): boolean => Math.abs(value.value - target) > 0.0005 || Math.abs(value.velocity) > 0.002;
  const target = tiltTarget(motion, { time: 0, phase: 0, sway: false });
  return spring(motion.tiltX, target.x) || spring(motion.tiltY, target.y) || spring(motion.hover, motion.hovering ? 1 : 0);
}

/** Pointer position in a box as the card sees it: -1 to 1, with y pointing up. */
export function pointerInBox(clientX: number, clientY: number, box: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }): { readonly x: number; readonly y: number } {
  const x = ((clientX - box.left) / Math.max(box.width, 1)) * 2 - 1;
  const y = 1 - ((clientY - box.top) / Math.max(box.height, 1)) * 2;
  return { x: Math.min(Math.max(x, -1), 1), y: Math.min(Math.max(y, -1), 1) };
}

/**
 * Seconds between two pictures of a card nobody touches, or null when it should stand still. A card under the pointer is
 * always drawn every frame. `load` (1 = as usual, higher = the graphics chip is struggling) stretches the gap.
 */
export function idleInterval(level: 'high' | 'normal', reducedMotion: boolean, load: number): number | null {
  if (reducedMotion) {
    return null;
  }
  const base = level === 'high' ? 1 / 40 : 1 / 24;
  return base * Math.max(load, 1);
}
