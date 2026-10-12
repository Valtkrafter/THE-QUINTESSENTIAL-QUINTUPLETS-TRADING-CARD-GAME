// Where everything stands on the battle table. The table is drawn on a fixed "stage" with its own measures (like a sheet of paper
// that is scaled to the window), so a card is always where the design puts it, the same on a laptop and on a big screen. There are
// two stages: a wide one (the table as in the animated explanation: steps on the left, the hand on the right) and a tall one for a
// phone held upright. This file is only numbers; `layout.test.ts` checks that nothing overlaps and everything is on the stage.

import { BENCH_SIZE } from '../../battle/rules';
import type { FigureRef, PlayerIndex } from '../../battle/types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly w: number;
  readonly h: number;
}

export interface Box extends Point, Size {}

export type LayoutName = 'wide' | 'tall';

/** Where one player's things stand. */
export interface SideLayout {
  readonly active: Point;
  /** The three places of the Bench, left to right. */
  readonly bench: readonly Point[];
  readonly deck: Point;
  readonly discard: Point;
  /** Who it is: the picture, the name and (for the rival) the cards in their hand. Null where the memories bar says it already. */
  readonly info: Box | null;
}

export interface Layout {
  readonly name: LayoutName;
  readonly width: number;
  readonly height: number;
  /** The picture of a Character in front and on the Bench. The strip with its health sits right under it. */
  readonly active: Size;
  readonly bench: Size;
  readonly strip: number;
  readonly pile: Size;
  readonly opp: SideLayout;
  readonly mine: SideLayout;
  /** What the rival's Active Character is weak to; what your moves do. */
  readonly foe: Box;
  readonly moves: Box;
  readonly steps: Box;
  /** The big picture of the card under the pointer. Null where there is no pointer (a phone). */
  readonly inspector: Box | null;
  readonly memories: { readonly opp: Box; readonly mine: Box };
  readonly hearts: Box;
  /** The hand: a grid (wide) or a row to scroll (tall). */
  readonly hand: Box;
  readonly handCell: Size;
  readonly handColumns: number;
}

/** The wide stage: 1280 x 660 (the caption bar under it is drawn by the page, not by the stage). */
const WIDE: Layout = {
  name: 'wide',
  width: 1280,
  height: 660,
  active: { w: 120, h: 168 },
  bench: { w: 76, h: 106 },
  strip: 14,
  pile: { w: 70, h: 98 },
  opp: {
    active: { x: 584, y: 134 },
    bench: [
      { x: 504, y: 8 },
      { x: 606, y: 8 },
      { x: 708, y: 8 },
    ],
    deck: { x: 278, y: 14 },
    discard: { x: 958, y: 14 },
    info: { x: 268, y: 134, w: 300, h: 182 },
  },
  mine: {
    active: { x: 584, y: 332 },
    bench: [
      { x: 504, y: 526 },
      { x: 606, y: 526 },
      { x: 708, y: 526 },
    ],
    deck: { x: 278, y: 540 },
    discard: { x: 958, y: 540 },
    info: { x: 268, y: 332, w: 300, h: 182 },
  },
  foe: { x: 724, y: 134, w: 300, h: 182 },
  moves: { x: 724, y: 332, w: 300, h: 182 },
  steps: { x: 14, y: 14, w: 236, h: 352 },
  inspector: { x: 14, y: 378, w: 236, h: 268 },
  memories: { opp: { x: 1040, y: 12, w: 226, h: 48 }, mine: { x: 1040, y: 64, w: 226, h: 48 } },
  hearts: { x: 1040, y: 484, w: 226, h: 162 },
  hand: { x: 1040, y: 122, w: 226, h: 352 },
  handCell: { w: 72, h: 100 },
  handColumns: 3,
};

/** The tall stage for a phone held upright: 420 x 884, the actives on the left with their panels beside them. */
const TALL: Layout = {
  name: 'tall',
  width: 420,
  height: 884,
  active: { w: 108, h: 151 },
  bench: { w: 70, h: 98 },
  strip: 12,
  pile: { w: 46, h: 64 },
  opp: {
    active: { x: 24, y: 216 },
    bench: [
      { x: 24, y: 98 },
      { x: 114, y: 98 },
      { x: 204, y: 98 },
    ],
    deck: { x: 300, y: 104 },
    discard: { x: 354, y: 104 },
    info: null,
  },
  mine: {
    active: { x: 24, y: 392 },
    bench: [
      { x: 24, y: 566 },
      { x: 114, y: 566 },
      { x: 204, y: 566 },
    ],
    deck: { x: 300, y: 572 },
    discard: { x: 354, y: 572 },
    info: null,
  },
  foe: { x: 144, y: 216, w: 266, h: 163 },
  moves: { x: 144, y: 392, w: 266, h: 163 },
  steps: { x: 10, y: 60, w: 400, h: 32 },
  inspector: null,
  memories: { opp: { x: 10, y: 6, w: 200, h: 50 }, mine: { x: 210, y: 6, w: 200, h: 50 } },
  hearts: { x: 10, y: 684, w: 400, h: 52 },
  hand: { x: 10, y: 742, w: 400, h: 138 },
  handCell: { w: 70, h: 98 },
  handColumns: 0,
};

export const LAYOUTS: Readonly<Record<LayoutName, Layout>> = { wide: WIDE, tall: TALL };

/** Which stage fits a window: the wide one needs room for the steps and the hand beside the table. */
export function layoutFor(windowWidth: number, windowHeight: number): Layout {
  return windowWidth >= 900 && windowHeight >= 520 && windowWidth / Math.max(windowHeight, 1) >= 1.25 ? WIDE : TALL;
}

/** Below this scale the tall stage is no longer fitted into the window as a whole: it keeps the width of the window and scrolls. */
const TALL_MIN_SCALE = 0.8;

/**
 * How much the stage is scaled to fit a space of this size. The wide stage is fitted as a whole. The tall one too, as long as that
 * keeps it readable (most phones held upright); on a short screen it keeps the width of the window and scrolls instead.
 */
export function fitScale(layout: Layout, spaceWidth: number, spaceHeight: number): number {
  if (spaceWidth <= 0 || spaceHeight <= 0) {
    return 1;
  }
  const whole = Math.min(spaceWidth / layout.width, spaceHeight / layout.height);
  if (layout.name === 'tall') {
    return whole >= TALL_MIN_SCALE ? Math.min(whole, 1.3) : Math.min(spaceWidth / layout.width, 1.3);
  }
  return whole;
}

/** The place of a Character (its picture) for a player. */
export function figurePoint(layout: Layout, side: PlayerIndex, ref: FigureRef): Point {
  const place = side === 0 ? layout.mine : layout.opp;
  if (ref.zone === 'active') {
    return place.active;
  }
  return place.bench[ref.index] ?? place.bench[BENCH_SIZE - 1] ?? place.active;
}

/** The size of the picture of a Character in this zone. */
export function figureSize(layout: Layout, ref: FigureRef): Size {
  return ref.zone === 'active' ? layout.active : layout.bench;
}
