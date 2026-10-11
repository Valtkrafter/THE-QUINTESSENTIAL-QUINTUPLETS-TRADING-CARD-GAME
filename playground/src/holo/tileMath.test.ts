import { describe, expect, it } from 'vitest';
import { MAX_TILT, createMotion, idleInterval, isMoving, pointerInBox, stepMotion, tiltTarget } from './tileMath';

describe('tilt target', () => {
  it('leans the card toward the pointer: the side under the pointer dips away', () => {
    const motion = { hovering: true, pointerX: 1, pointerY: 1 };
    const target = tiltTarget(motion, { time: 0, phase: 0, sway: true });
    expect(target.x).toBeCloseTo(-MAX_TILT);
    expect(target.y).toBeCloseTo(MAX_TILT);
  });

  it('sways slowly and differently for each phase when nobody touches the card, and stands still without sway', () => {
    const idle = { hovering: false, pointerX: 0, pointerY: 0 };
    const a = tiltTarget(idle, { time: 3, phase: 0, sway: true });
    const b = tiltTarget(idle, { time: 3, phase: 2, sway: true });
    expect(Math.abs(a.x) + Math.abs(a.y)).toBeGreaterThan(0);
    expect(a).not.toEqual(b);
    expect(Math.abs(a.x)).toBeLessThanOrEqual(MAX_TILT * 0.28 + 1e-9);
    expect(Math.abs(a.y)).toBeLessThanOrEqual(MAX_TILT * 0.4 + 1e-9);
    expect(tiltTarget(idle, { time: 3, phase: 0, sway: false })).toEqual({ x: 0, y: 0 });
  });
});

describe('the motion of a tile', () => {
  it('settles at its target and then reports that it no longer moves', () => {
    const motion = createMotion();
    motion.hovering = true;
    motion.pointerX = 0.5;
    motion.pointerY = -0.5;
    expect(isMoving(motion)).toBe(true);
    for (let frame = 0; frame < 240; frame += 1) {
      stepMotion(motion, { delta: 1 / 60, time: frame / 60, phase: 0, sway: false });
    }
    expect(motion.hover.value).toBeCloseTo(1, 2);
    expect(motion.tiltY.value).toBeCloseTo(0.5 * MAX_TILT, 2);
    expect(isMoving(motion)).toBe(false);
  });

  it('eases back when the pointer leaves', () => {
    const motion = createMotion();
    motion.hovering = true;
    motion.pointerX = 1;
    for (let frame = 0; frame < 120; frame += 1) {
      stepMotion(motion, { delta: 1 / 60, time: 0, phase: 0, sway: false });
    }
    motion.hovering = false;
    for (let frame = 0; frame < 240; frame += 1) {
      stepMotion(motion, { delta: 1 / 60, time: 0, phase: 0, sway: false });
    }
    expect(Math.abs(motion.tiltY.value)).toBeLessThan(0.01);
    expect(motion.hover.value).toBeCloseTo(0, 2);
  });
});

describe('pointer in a box', () => {
  const box = { left: 100, top: 50, width: 200, height: 300 };

  it('is -1 to 1 across the box with y up, and never leaves that range', () => {
    expect(pointerInBox(200, 200, box)).toEqual({ x: 0, y: 0 });
    expect(pointerInBox(100, 50, box)).toEqual({ x: -1, y: 1 });
    expect(pointerInBox(300, 350, box)).toEqual({ x: 1, y: -1 });
    expect(pointerInBox(-500, 900, box)).toEqual({ x: -1, y: -1 });
  });
});

describe('idle frame interval', () => {
  it('is shorter on high graphics, stretches under load, and is off for reduced motion', () => {
    const high = idleInterval('high', false, 1);
    const normal = idleInterval('normal', false, 1);
    expect(high).not.toBeNull();
    expect(normal).not.toBeNull();
    expect(high ?? 0).toBeLessThan(normal ?? 0);
    expect(idleInterval('high', false, 3) ?? 0).toBeCloseTo((high ?? 0) * 3);
    expect(idleInterval('high', false, 0.2)).toBe(high);
    expect(idleInterval('high', true, 1)).toBeNull();
  });
});
