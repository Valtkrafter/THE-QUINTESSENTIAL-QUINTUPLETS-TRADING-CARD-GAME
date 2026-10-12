import { describe, expect, it } from 'vitest';
import { BENCH_SIZE } from '../../battle/rules';
import { LAYOUTS, fitScale, figurePoint, figureSize, layoutFor, type Box, type Layout } from './layout';

interface Named extends Box {
  readonly name: string;
}

/** Everything that stands on the stage and must not stand on anything else, as boxes. */
function boxesOf(layout: Layout): Named[] {
  const boxes: Named[] = [];
  const figure = (name: string, point: { x: number; y: number }, size: { w: number; h: number }) => boxes.push({ name, x: point.x, y: point.y, w: size.w, h: size.h + layout.strip });
  for (const [side, place] of [
    ['opponent', layout.opp],
    ['you', layout.mine],
  ] as const) {
    figure(`${side} active`, place.active, layout.active);
    place.bench.forEach((point, index) => figure(`${side} bench ${index + 1}`, point, layout.bench));
    boxes.push({ name: `${side} deck`, ...place.deck, ...layout.pile });
    boxes.push({ name: `${side} discard`, ...place.discard, ...layout.pile });
    if (place.info !== null) {
      boxes.push({ name: `${side} info`, ...place.info });
    }
  }
  boxes.push({ name: 'foe', ...layout.foe }, { name: 'moves', ...layout.moves }, { name: 'steps', ...layout.steps });
  if (layout.inspector !== null) {
    boxes.push({ name: 'inspector', ...layout.inspector });
  }
  boxes.push({ name: 'memories opponent', ...layout.memories.opp }, { name: 'memories you', ...layout.memories.mine });
  boxes.push({ name: 'hearts', ...layout.hearts }, { name: 'hand', ...layout.hand });
  return boxes;
}

function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe.each(Object.values(LAYOUTS))('the $name stage', (layout) => {
  it('keeps everything on the stage', () => {
    for (const box of boxesOf(layout)) {
      expect(box.x, box.name).toBeGreaterThanOrEqual(0);
      expect(box.y, box.name).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w, box.name).toBeLessThanOrEqual(layout.width);
      expect(box.y + box.h, box.name).toBeLessThanOrEqual(layout.height);
    }
  });

  it('puts nothing on top of anything else', () => {
    const boxes = boxesOf(layout);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a !== undefined && b !== undefined) {
          expect(overlap(a, b), `${a.name} and ${b.name}`).toBe(false);
        }
      }
    }
  });

  it('has a place for every Character: one in front and three on the Bench, for both players', () => {
    expect(layout.opp.bench).toHaveLength(BENCH_SIZE);
    expect(layout.mine.bench).toHaveLength(BENCH_SIZE);
    for (const side of [0, 1] as const) {
      expect(figurePoint(layout, side, { zone: 'active' })).toEqual(side === 0 ? layout.mine.active : layout.opp.active);
      for (let index = 0; index < BENCH_SIZE; index += 1) {
        expect(figurePoint(layout, side, { zone: 'bench', index })).toEqual((side === 0 ? layout.mine : layout.opp).bench[index]);
      }
    }
    expect(figureSize(layout, { zone: 'active' })).toEqual(layout.active);
    expect(figureSize(layout, { zone: 'bench', index: 1 })).toEqual(layout.bench);
  });

  it('keeps the rival above you: the rival Characters stand higher than yours', () => {
    expect(layout.opp.active.y).toBeLessThan(layout.mine.active.y);
    expect(layout.opp.bench[0]?.y ?? 0).toBeLessThan(layout.mine.bench[0]?.y ?? 0);
  });
});

describe('the hand', () => {
  it('is a grid of three columns on the wide stage, with nine cards in sight before it has to scroll', () => {
    const wide = LAYOUTS.wide;
    expect(wide.handColumns).toBe(3);
    // Each cell is two pixels narrower than its place, and the cells are four pixels apart (see HandView).
    expect(wide.handColumns * (wide.handCell.w - 2) + (wide.handColumns - 1) * 4 + 8).toBeLessThanOrEqual(wide.hand.w);
    const rows = Math.floor((wide.hand.h - 30) / (wide.handCell.h + 4));
    expect(rows * wide.handColumns).toBeGreaterThanOrEqual(9);
  });

  it('is one row on the tall stage, as wide as the stage', () => {
    const tall = LAYOUTS.tall;
    expect(tall.handColumns).toBe(0);
    expect(tall.hand.w).toBeGreaterThanOrEqual(tall.width - 20);
    expect(tall.handCell.h).toBeLessThanOrEqual(tall.hand.h);
  });
});

describe('fitting the stage to a window', () => {
  it('picks the wide stage for a landscape window and the tall one for a phone', () => {
    expect(layoutFor(1280, 800).name).toBe('wide');
    expect(layoutFor(1920, 1080).name).toBe('wide');
    expect(layoutFor(390, 844).name).toBe('tall');
    expect(layoutFor(820, 1180).name).toBe('tall');
    expect(layoutFor(844, 390).name).toBe('tall');
  });

  it('scales the wide stage to fit as a whole, and the tall one too unless that makes it too small', () => {
    expect(fitScale(LAYOUTS.wide, 1280, 660)).toBe(1);
    expect(fitScale(LAYOUTS.wide, 2560, 660)).toBe(1);
    expect(fitScale(LAYOUTS.wide, 640, 2000)).toBe(0.5);
    // A phone held upright (the caption bar takes about 90 px): the whole stage fits, so nothing hides under the caption.
    expect(fitScale(LAYOUTS.tall, 390, 752)).toBeCloseTo(752 / 884, 5);
    // A short phone would have to shrink it too far: it keeps the width and scrolls.
    expect(fitScale(LAYOUTS.tall, 360, 548)).toBeCloseTo(360 / 420, 5);
    expect(fitScale(LAYOUTS.tall, 210, 300)).toBe(0.5);
    expect(fitScale(LAYOUTS.tall, 2000, 300)).toBeLessThanOrEqual(1.3);
    expect(fitScale(LAYOUTS.wide, 0, 0)).toBe(1);
  });
});
