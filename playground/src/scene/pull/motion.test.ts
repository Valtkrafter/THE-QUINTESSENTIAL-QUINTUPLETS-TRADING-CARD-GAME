import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CARD_HOME_Y, IMPACT_POINT, cardPose, easeInOutCubic, easeOutBack, flightProgress, flipAngle, smoothstep, starPath } from './motion';

const STEPS = 200;

function samples(fn: (t: number) => number): number[] {
  return Array.from({ length: STEPS + 1 }, (_, i) => fn(i / STEPS));
}

function neverDecreases(values: readonly number[]): boolean {
  return values.every((value, i) => i === 0 || value >= (values[i - 1] ?? 0) - 1e-12);
}

describe('curves', () => {
  it('smoothstep runs from 0 to 1 and stays inside', () => {
    expect(smoothstep(0, 1, -3)).toBe(0);
    expect(smoothstep(0, 1, 5)).toBe(1);
    expect(smoothstep(2, 4, 3)).toBeCloseTo(0.5);
  });

  it('easings start at 0 and end at 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
    expect(Math.max(...samples(easeOutBack))).toBeGreaterThan(1);
  });
});

describe('the shooting star', () => {
  it('starts far away at the top left and lands at the impact point', () => {
    const start = starPath(0);
    expect(start.x).toBeLessThan(-8);
    expect(start.y).toBeGreaterThan(6);
    expect(start.z).toBeLessThan(-12);
    expect(starPath(1).distanceTo(IMPACT_POINT)).toBeLessThan(1e-9);
  });

  it('comes closer to the camera all the way', () => {
    const z = samples((t) => starPath(t).z);
    expect(neverDecreases(z)).toBe(true);
  });

  it('writes into the vector it is given', () => {
    const out = new Vector3();
    expect(starPath(0.5, out)).toBe(out);
  });

  it('moves along the path without running backwards, with or without the hang', () => {
    for (const hang of [false, true]) {
      const progress = samples((t) => flightProgress(t, hang));
      expect(progress[0]).toBe(0);
      expect(progress.at(-1)).toBeCloseTo(1, 10);
      expect(neverDecreases(progress)).toBe(true);
    }
  });

  it('speeds up while falling and slows down to hang before the plunge', () => {
    expect(flightProgress(0.5, false)).toBeLessThan(0.5);
    const early = flightProgress(0.1, true);
    const hangStart = flightProgress(0.72, true);
    const hangLater = flightProgress(0.76, true);
    expect(hangStart).toBeCloseTo(0.86);
    // Almost standing still just after the hang begins, then moving fast at the end.
    expect(hangLater - hangStart).toBeLessThan(0.002);
    expect(flightProgress(1, true) - flightProgress(0.96, true)).toBeGreaterThan(0.02);
    expect(early).toBeLessThan(0.05);
  });
});

describe('the card', () => {
  it('turns from face down (0) to face up (1) and never turns back, however dramatic', () => {
    for (const drama of [0, 0.35, 1]) {
      const angle = samples((t) => flipAngle(t, drama));
      expect(angle[0]).toBeCloseTo(0);
      expect(angle.at(-1)).toBeCloseTo(1);
      expect(neverDecreases(angle)).toBe(true);
    }
  });

  it('almost stops on its edge when the flip is dramatic', () => {
    const creep = flipAngle(0.66, 1) - flipAngle(0.56, 1);
    expect(creep).toBeLessThan(0.04);
    expect(flipAngle(0.66, 0) - flipAngle(0.56, 0)).toBeGreaterThan(0.1);
  });

  it('enters face down, flips to face up in the same spot, and leaves face up', () => {
    const entering = cardPose('enter', 1, 0);
    const flipStart = cardPose('flip', 0, 0);
    const flipEnd = cardPose('flip', 1, 0);
    const shown = cardPose('show', 0.5, 0);
    const leavingStart = cardPose('exit', 0, 0);
    expect(entering.turn).toBeCloseTo(Math.PI);
    expect(entering.y).toBeCloseTo(CARD_HOME_Y);
    expect(flipStart.turn).toBeCloseTo(Math.PI);
    expect(flipEnd.turn).toBeCloseTo(0);
    expect(flipEnd.y).toBeCloseTo(shown.y);
    expect(shown.turn).toBe(0);
    expect(leavingStart.y).toBeCloseTo(shown.y);
    expect(cardPose('exit', 1, 0).y).toBeLessThan(-5);
  });

  it('lifts towards the camera in the middle of a flip, more when dramatic', () => {
    const plain = cardPose('flip', 0.5, 0);
    const dramatic = cardPose('flip', 0.62, 1);
    expect(plain.z).toBeGreaterThan(0.5);
    expect(dramatic.z).toBeGreaterThan(1);
  });

  it('keeps the card out of sight in the phases that have no card', () => {
    for (const phase of ['intro', 'flight', 'impact', 'summary'] as const) {
      expect(cardPose(phase, 0.5, 0).y).toBeLessThan(-5);
    }
  });
});
