import { describe, expect, it, vi } from 'vitest';
import type { Rarity } from '../../cards/model';
import { phaseDuration, type DirectorEvent } from './director';
import { PullRunner } from './runner';

const pack = (...rarities: Rarity[]) => ({ rarities });
const INTRO = phaseDuration('full', pack('C'), 'intro', 0);

describe('the runner', () => {
  it('starts in the intro, or at the first card when the show is off', () => {
    expect(new PullRunner([pack('C', 'U', 'R', 'RR', 'SAR')], 'full').getSnapshot().phase).toBe('intro');
    expect(new PullRunner([pack('C', 'U', 'R', 'RR', 'SAR')], 'off').getSnapshot().phase).toBe('enter');
  });

  it('keeps the snapshot while time passes inside a phase and replaces it when the phase changes', () => {
    const runner = new PullRunner([pack('C', 'C', 'U', 'U', 'R')], 'full');
    let notified = 0;
    runner.subscribe(() => {
      notified += 1;
    });
    const first = runner.getSnapshot();
    runner.step(0.2);
    expect(runner.getSnapshot()).toBe(first);
    expect(notified).toBe(0);
    runner.step(INTRO);
    expect(runner.getSnapshot()).not.toBe(first);
    expect(runner.getSnapshot().phase).toBe('flight');
    expect(notified).toBe(1);
  });

  it('tells the listeners about the impact exactly once, and stops after they unsubscribe', () => {
    const runner = new PullRunner([pack('C', 'C', 'U', 'U', 'R')], 'full');
    const seen: DirectorEvent[] = [];
    const stop = runner.onEvent((event) => seen.push(event));
    runner.step(5);
    runner.step(5);
    expect(seen.filter((event) => event.type === 'impact')).toHaveLength(1);
    stop();
    const count = seen.length;
    runner.tap();
    runner.tap();
    expect(seen).toHaveLength(count);
  });

  it('keeps going when a listener breaks, and still tells the other listeners', () => {
    const runner = new PullRunner([pack('C', 'C', 'U', 'U', 'R')], 'full');
    const seen: DirectorEvent[] = [];
    runner.onEvent(() => {
      throw new Error('a sound failed');
    });
    runner.onEvent((event) => seen.push(event));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    runner.step(8);
    quiet.mockRestore();
    expect(seen.some((event) => event.type === 'impact')).toBe(true);
    expect(runner.state.phase).not.toBe('intro');
  });

  it('plays a pack from the first tap to the summary, and a skip ends it at once', () => {
    const runner = new PullRunner([pack('C', 'U', 'R', 'RR', 'SAR')], 'full');
    runner.tap();
    runner.tap();
    // A pack with a Special Art Rare has a ceremony before its first card.
    expect(runner.getSnapshot()).toMatchObject({ phase: 'ceremony' });
    runner.tap();
    expect(runner.getSnapshot()).toMatchObject({ phase: 'enter', card: 0 });
    for (let i = 0; i < 5; i += 1) {
      runner.tap();
      runner.tap();
      runner.tap();
    }
    expect(runner.getSnapshot().phase).toBe('summary');
    const other = new PullRunner([pack('C', 'U', 'R', 'RR', 'SAR')], 'full');
    other.skip();
    expect(other.getSnapshot().phase).toBe('summary');
  });
});
