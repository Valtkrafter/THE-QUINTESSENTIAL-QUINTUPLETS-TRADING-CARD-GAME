// Where the speech bubble goes in relation to the lit-up spot. Pure code (it only does sums), so it is tested.

import type { Side } from './types';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Size {
  readonly w: number;
  readonly h: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Space kept free at the edge of the window, and between the spot and the bubble. */
export const EDGE = 12;
export const GAP = 14;

/** A window narrower than this gets a bubble as wide as the window. */
export const NARROW = 640;

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

/** The smallest rectangle that holds all of the given ones. */
export function union(rects: readonly Rect[]): Rect | null {
  const first = rects[0];
  if (first === undefined) {
    return null;
  }
  let left = first.x;
  let top = first.y;
  let right = first.x + first.w;
  let bottom = first.y + first.h;
  for (const rect of rects) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.w);
    bottom = Math.max(bottom, rect.y + rect.h);
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** The width the bubble gets in a window of this width. */
export function bubbleWidth(viewportWidth: number): number {
  return viewportWidth < NARROW ? Math.max(0, viewportWidth - 2 * EDGE) : Math.min(380, viewportWidth - 2 * EDGE);
}

/**
 * The top left corner of the bubble. Without a target the bubble sits in the middle, or at the bottom while the page must stay
 * visible. With a target it goes on the wanted side if it fits there, else on the first side that fits (below, above, right, left),
 * and if no side fits (the spot is as big as the window) at the bottom of the window.
 */
export function placeBubble(target: Rect | null, bubble: Size, viewport: Size, side?: Side, centred = true): Point {
  const left = clamp((viewport.w - bubble.w) / 2, EDGE, viewport.w - bubble.w - EDGE);
  const bottom = Math.max(EDGE, viewport.h - bubble.h - EDGE - 8);
  if (target === null) {
    if (side === 'above') {
      // Out of the way of what happens in the middle of the window and at the bottom (a show, a reveal).
      return { x: left, y: EDGE + 56 };
    }
    return centred ? { x: left, y: clamp((viewport.h - bubble.h) / 2, EDGE, viewport.h - bubble.h - EDGE) } : { x: left, y: bottom };
  }
  const narrow = viewport.w < NARROW;
  const around = (kind: Side): Point | null => {
    switch (kind) {
      case 'below': {
        const y = target.y + target.h + GAP;
        return y + bubble.h <= viewport.h - EDGE ? { x: narrow ? left : clamp(target.x + target.w / 2 - bubble.w / 2, EDGE, viewport.w - bubble.w - EDGE), y } : null;
      }
      case 'above': {
        const y = target.y - GAP - bubble.h;
        return y >= EDGE ? { x: narrow ? left : clamp(target.x + target.w / 2 - bubble.w / 2, EDGE, viewport.w - bubble.w - EDGE), y } : null;
      }
      case 'right': {
        const x = target.x + target.w + GAP;
        return !narrow && x + bubble.w <= viewport.w - EDGE ? { x, y: clamp(target.y + target.h / 2 - bubble.h / 2, EDGE, viewport.h - bubble.h - EDGE) } : null;
      }
      case 'left': {
        const x = target.x - GAP - bubble.w;
        return !narrow && x >= EDGE ? { x, y: clamp(target.y + target.h / 2 - bubble.h / 2, EDGE, viewport.h - bubble.h - EDGE) } : null;
      }
    }
  };
  const order: readonly Side[] = side === undefined ? ['below', 'above', 'right', 'left'] : [side, 'below', 'above', 'right', 'left'];
  for (const kind of order) {
    const found = around(kind);
    if (found !== null) {
      return found;
    }
  }
  // No side is free (the spot is as big as the window): the bubble covers the least of it, at the top or at the bottom.
  const overlap = (at: Point): number => {
    const width = Math.max(0, Math.min(at.x + bubble.w, target.x + target.w) - Math.max(at.x, target.x));
    const height = Math.max(0, Math.min(at.y + bubble.h, target.y + target.h) - Math.max(at.y, target.y));
    return width * height;
  };
  const low: Point = { x: left, y: bottom };
  const high: Point = { x: left, y: EDGE };
  return overlap(low) <= overlap(high) ? low : high;
}
