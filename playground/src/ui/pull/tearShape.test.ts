import { describe, expect, it } from 'vitest';
import { TEAR_LINE, dragProgress, flapAngle, releaseTarget, tearShape } from './tearShape';

/** The points of a `polygon(...)` string as numbers. */
function pointsOf(polygon: string): [number, number][] {
  const inside = polygon.slice(polygon.indexOf('(') + 1, polygon.lastIndexOf(')'));
  return inside.split(', ').map((pair) => {
    const [x, y] = pair.split(' ').map((part) => Number.parseFloat(part));
    return [x ?? Number.NaN, y ?? Number.NaN];
  });
}

describe('the shape of a tear', () => {
  it('has not touched the pack before the swipe: the strip is whole and the flap has no width', () => {
    const shape = tearShape(0);
    const flap = pointsOf(shape.flap);
    expect(Math.max(...flap.map(([x]) => x))).toBe(0);
    const strip = pointsOf(shape.strip);
    expect(strip).toEqual([
      [0, 0],
      [100, 0],
      [100, TEAR_LINE],
      [0, TEAR_LINE],
    ]);
    expect(flapAngle(0)).toBe(0);
  });

  it('has torn the whole strip at the end: nothing of it is left to the right', () => {
    const shape = tearShape(1);
    expect(Math.min(...pointsOf(shape.strip).map(([x]) => x))).toBe(100);
    expect(Math.max(...pointsOf(shape.flap).map(([x]) => x))).toBe(100);
    expect(shape.pivot).toBe(`100.00% ${TEAR_LINE.toFixed(1)}%`);
  });

  it('tears from left to right: the torn edge reaches exactly as far as the progress says', () => {
    for (const progress of [0.2, 0.5, 0.8]) {
      const shape = tearShape(progress);
      const rest = pointsOf(shape.rest);
      // The ragged edge is the first part of the rest and ends where the tear is.
      const reach = rest.findIndex(([x, y]) => Math.abs(x - progress * 100) < 0.01 && y === TEAR_LINE);
      expect(reach).toBeGreaterThan(0);
      expect(rest.slice(0, reach + 1).every(([x]) => x <= progress * 100 + 0.01)).toBe(true);
      expect(pointsOf(shape.strip)[0]?.[0]).toBeCloseTo(progress * 100, 1);
    }
  });

  it('keeps the ragged edge near the line and the rest below it', () => {
    const rest = pointsOf(tearShape(1).rest);
    for (const [, y] of rest.slice(0, -2)) {
      expect(Math.abs(y - TEAR_LINE)).toBeLessThan(2);
    }
    const last = rest.at(-1);
    expect(last).toEqual([0, 100]);
  });

  it('turns the torn strip further up the further the tear went', () => {
    const angles = [0.1, 0.4, 0.7, 1].map(flapAngle);
    expect([...angles].sort((a, b) => a - b)).toEqual(angles);
    expect(angles[0]).toBeGreaterThan(0);
    expect(flapAngle(1)).toBeLessThan(90);
  });

  it('clamps a progress outside 0 to 1', () => {
    expect(tearShape(-3)).toEqual(tearShape(0));
    expect(tearShape(7)).toEqual(tearShape(1));
  });
});

describe('the swipe', () => {
  it('turns movement to the right into progress, and nothing else', () => {
    expect(dragProgress(100, 100, 200)).toBe(0);
    expect(dragProgress(100, 200, 200)).toBe(0.5);
    expect(dragProgress(100, 500, 200)).toBe(1);
    expect(dragProgress(100, 40, 200)).toBe(0);
    expect(dragProgress(100, 300, 0)).toBe(0);
  });

  it('lets go to the end from the middle on, and back to the start before', () => {
    expect(releaseTarget(0.9)).toBe(1);
    expect(releaseTarget(0.4)).toBe(1);
    expect(releaseTarget(0.2)).toBe(0);
    expect(releaseTarget(0)).toBe(0);
  });
});
