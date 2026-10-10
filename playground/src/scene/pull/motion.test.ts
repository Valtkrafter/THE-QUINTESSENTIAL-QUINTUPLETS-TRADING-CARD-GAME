import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  CARD_HOME_Y,
  cardPose,
  diveBlur,
  easeInOutCubic,
  easeOutBack,
  flipAngle,
  gateEnergy,
  gateGlow,
  gateOpen,
  gateTime,
  gateZoom,
  needlePath,
  needleProgress,
  smoothstep,
  speedLines,
  stormFade,
  stormZoom,
  whiteOut,
} from './motion';

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

describe('the needle and the gate', () => {
  it('starts close to the camera at the lower left, off screen, and ends far away in the middle', () => {
    const start = needlePath(0);
    expect(start.x).toBeLessThan(-4);
    expect(start.y).toBeLessThan(-2);
    expect(start.z).toBeGreaterThan(3);
    const end = needlePath(1);
    expect(Math.abs(end.x)).toBeLessThan(0.1);
    expect(end.z).toBeLessThan(-30);
  });

  it('moves away from the camera all the way', () => {
    const z = samples((t) => needlePath(t).z);
    expect(z.every((value, i) => i === 0 || value <= (z[i - 1] ?? 0) + 1e-9)).toBe(true);
  });

  it('writes into the vector it is given', () => {
    const out = new Vector3();
    expect(needlePath(0.5, out)).toBe(out);
  });

  it('moves along the path without running backwards, with or without the hang', () => {
    for (const hang of [false, true]) {
      const progress = samples((t) => needleProgress(t, hang));
      expect(progress[0]).toBe(0);
      expect(progress.at(-1)).toBeCloseTo(1, 10);
      expect(neverDecreases(progress)).toBe(true);
    }
  });

  it('is fast at first and glides in, and with the hang it nearly stops before the plunge', () => {
    expect(needleProgress(0.2, false)).toBeGreaterThan(0.3);
    const hangStart = needleProgress(0.72, true);
    expect(hangStart).toBeCloseTo(0.82);
    // Almost standing still just after the hang begins, then moving fast at the end.
    expect(needleProgress(0.76, true) - hangStart).toBeLessThan(0.002);
    expect(needleProgress(1, true) - needleProgress(0.96, true)).toBeGreaterThan(0.02);
  });

  it('lets the gate appear, glow, dive and white out in this order, each only ever growing', () => {
    for (const curve of [gateOpen, gateEnergy, gateZoom, speedLines, diveBlur, whiteOut]) {
      expect(neverDecreases(samples(curve))).toBe(true);
    }
    expect(gateOpen(0)).toBe(0);
    expect(gateOpen(1)).toBe(1);
    expect(gateEnergy(0.1)).toBe(0);
    expect(gateEnergy(1)).toBe(1);
    expect(whiteOut(0.5)).toBe(0);
    expect(whiteOut(1)).toBe(1);
    expect(gateZoom(0)).toBeCloseTo(0.5);
    expect(gateZoom(0.62)).toBeCloseTo(1, 1);
    expect(gateZoom(1)).toBeGreaterThan(3);
    // The white-out comes after the glow has started and the dive is under way.
    expect(gateEnergy(0.84)).toBeGreaterThan(0.5);
    expect(diveBlur(0.8)).toBeGreaterThan(0);
  });

  it('lets the gate shine brightest just before the rush outwards and dim during it', () => {
    const glow = samples(gateGlow);
    const peak = Math.max(...glow);
    expect(peak).toBeGreaterThan(0.9);
    expect(glow[0]).toBe(0);
    expect(gateGlow(1)).toBeLessThan(0.4);
    expect(gateGlow(0.8)).toBeGreaterThan(0.9);
    // It never rises again once it has started to dim.
    const dimming = glow.slice(Math.round(0.83 * STEPS));
    expect(dimming.every((value, i) => i === 0 || value <= (dimming[i - 1] ?? 1) + 1e-9)).toBe(true);
  });

  it('runs the gate on its own clock, which waits for the plunge when the needle hangs', () => {
    for (const hang of [false, true]) {
      const times = samples((t) => gateTime(t, hang));
      expect(times[0]).toBe(0);
      expect(times.at(-1)).toBeCloseTo(1, 10);
      expect(neverDecreases(times)).toBe(true);
    }
    expect(gateTime(0.5, false)).toBe(0.5);
    // When the needle starts to plunge the gate glows but has neither rushed outwards nor whited out yet.
    const waiting = gateTime(0.72, true);
    expect(gateEnergy(waiting)).toBeGreaterThan(0.5);
    expect(gateZoom(waiting)).toBeLessThan(1.05);
    expect(whiteOut(waiting)).toBe(0);
  });

  it('falls into the eye of the storm and then fades to black', () => {
    expect(neverDecreases(samples(stormZoom))).toBe(true);
    expect(stormZoom(0)).toBe(1);
    expect(stormZoom(1)).toBeGreaterThan(4);
    expect(stormFade(0.5)).toBe(1);
    expect(stormFade(1)).toBe(0);
    expect(samples(stormFade).every((value, i, all) => i === 0 || value <= (all[i - 1] ?? 1) + 1e-9)).toBe(true);
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
