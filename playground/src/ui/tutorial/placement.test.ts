import { describe, expect, it } from 'vitest';
import { EDGE, GAP, bubbleWidth, placeBubble, union } from './placement';

const WINDOW = { w: 1280, h: 800 };
const BUBBLE = { w: 380, h: 180 };

describe('the bubble of the introduction', () => {
  it('sits in the middle when there is no spot, or at the bottom while the page has to stay in view', () => {
    expect(placeBubble(null, BUBBLE, WINDOW)).toEqual({ x: 450, y: 310 });
    const low = placeBubble(null, BUBBLE, WINDOW, undefined, false);
    expect(low.x).toBe(450);
    expect(low.y + BUBBLE.h).toBeLessThan(WINDOW.h);
    expect(low.y).toBeGreaterThan(WINDOW.h / 2);
  });

  it('sits at the top when it has no spot and was asked to be above, so a show or a reveal can be seen', () => {
    expect(placeBubble(null, BUBBLE, WINDOW, 'above', false)).toEqual({ x: 450, y: EDGE + 56 });
  });

  it('goes below a spot, centred on it', () => {
    const point = placeBubble({ x: 300, y: 100, w: 200, h: 60 }, BUBBLE, WINDOW);
    expect(point).toEqual({ x: 300 + 100 - 190, y: 160 + GAP });
  });

  it('goes above when there is no room below, and stays inside the window', () => {
    const point = placeBubble({ x: 40, y: 700, w: 200, h: 60 }, BUBBLE, WINDOW);
    expect(point.y).toBe(700 - GAP - BUBBLE.h);
    expect(point.x).toBeGreaterThanOrEqual(EDGE);
  });

  it('goes to the side when there is no room above or below', () => {
    const point = placeBubble({ x: 100, y: 20, w: 200, h: 760 }, BUBBLE, WINDOW);
    expect(point.x).toBe(300 + GAP);
  });

  it('goes where it was asked to if it fits there', () => {
    const target = { x: 500, y: 300, w: 100, h: 100 };
    expect(placeBubble(target, BUBBLE, WINDOW, 'above').y).toBe(300 - GAP - BUBBLE.h);
    expect(placeBubble(target, BUBBLE, WINDOW, 'right').x).toBe(600 + GAP);
    expect(placeBubble(target, BUBBLE, WINDOW, 'left').x).toBe(500 - GAP - BUBBLE.w);
  });

  it('sits at the bottom when the spot is as big as the window', () => {
    const point = placeBubble({ x: 0, y: 0, w: 1280, h: 800 }, BUBBLE, WINDOW);
    expect(point.y + BUBBLE.h).toBeLessThanOrEqual(WINDOW.h - EDGE);
    expect(point.y).toBeGreaterThan(400);
  });

  it('covers the least of a spot that fills most of the window: at the top when the spot is at the bottom', () => {
    const lower = placeBubble({ x: 0, y: 150, w: 1280, h: 600 }, BUBBLE, WINDOW);
    expect(lower.y).toBe(EDGE);
    const upper = placeBubble({ x: 0, y: 50, w: 1280, h: 600 }, BUBBLE, WINDOW);
    expect(upper.y + BUBBLE.h).toBeLessThanOrEqual(WINDOW.h - EDGE);
    expect(upper.y).toBeGreaterThan(300);
  });

  it('is as wide as the window on a phone, and goes above or below the spot there', () => {
    expect(bubbleWidth(390)).toBe(390 - 2 * EDGE);
    expect(bubbleWidth(1280)).toBe(380);
    const phone = { w: 390, h: 844 };
    const bubble = { w: bubbleWidth(390), h: 200 };
    const point = placeBubble({ x: 20, y: 300, w: 120, h: 60 }, bubble, phone);
    expect(point.x).toBe(EDGE);
    expect(point.y).toBe(360 + GAP);
  });
});

describe('the rectangle that holds several spots', () => {
  it('is nothing for no spot', () => {
    expect(union([])).toBeNull();
  });

  it('holds all of them', () => {
    expect(
      union([
        { x: 10, y: 20, w: 30, h: 40 },
        { x: 100, y: 5, w: 10, h: 10 },
      ]),
    ).toEqual({ x: 10, y: 5, w: 100, h: 55 });
  });
});
