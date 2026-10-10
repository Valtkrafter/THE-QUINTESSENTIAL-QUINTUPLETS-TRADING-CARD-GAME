import { describe, expect, it } from 'vitest';
import { MIN_RESOLUTION_SCALE, SpeedMeter, smallerScale } from './speedMeter';

function feed(meter: SpeedMeter, frames: number, delta: number): boolean[] {
  return Array.from({ length: frames }, () => meter.push(delta));
}

describe('the speed meter', () => {
  it('stays quiet while the show runs smoothly', () => {
    const meter = new SpeedMeter();
    expect(feed(meter, 600, 1 / 60).some(Boolean)).toBe(false);
  });

  it('says so once, after a full window of slow frames, and then gives the change time to show', () => {
    const meter = new SpeedMeter(0.028, 45, 90);
    const result = feed(meter, 45 + 90 + 44, 0.04);
    expect(result.filter(Boolean)).toHaveLength(1);
    expect(result.indexOf(true)).toBe(44);
    // After the cool-down it looks again, and a still slow show is reported again.
    expect(feed(meter, 1, 0.04)[0]).toBe(true);
  });

  it('ignores pauses, which say nothing about the speed', () => {
    const meter = new SpeedMeter();
    expect(feed(meter, 200, 1).some(Boolean)).toBe(false);
    expect(feed(meter, 44, 0.01).some(Boolean)).toBe(false);
  });

  it('judges the average of the window, not a single slow frame', () => {
    const meter = new SpeedMeter(0.028, 45, 90);
    const frames = [...Array.from({ length: 44 }, () => 1 / 60), 0.2];
    expect(frames.map((delta) => meter.push(delta)).some(Boolean)).toBe(false);
  });
});

describe('the picture size', () => {
  it('gets smaller in steps and never below the minimum', () => {
    let scale = 1;
    const seen: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      scale = smallerScale(scale);
      seen.push(scale);
    }
    expect(seen[0]).toBeLessThan(1);
    expect(seen.every((value, i) => i === 0 || value <= (seen[i - 1] ?? 1))).toBe(true);
    expect(seen.at(-1)).toBe(MIN_RESOLUTION_SCALE);
  });
});
