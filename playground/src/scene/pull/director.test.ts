import { describe, expect, it } from 'vitest';
import type { Rarity } from '../../cards/model';
import {
  advance,
  bestRarity,
  isCinematic,
  phaseDuration,
  progress,
  revealOrder,
  skipAll,
  startState,
  tap,
  type DirectorEvent,
  type DirectorState,
  type PullMode,
  type ShowPack,
} from './director';

const pack = (...rarities: Rarity[]): ShowPack => ({ rarities });
const PLAIN = pack('C', 'U', 'C', 'R', 'U');
const RARE = pack('C', 'U', 'C', 'RR', 'SAR');

function phases(events: readonly DirectorEvent[]): string[] {
  return events.flatMap((event) => (event.type === 'phase' ? [`${event.phase}:${event.pack}.${event.card}`] : []));
}

/** Plays a show to its end by only letting time pass and tapping when a card waits. */
function playThrough(packs: readonly ShowPack[], mode: PullMode): { state: DirectorState; events: DirectorEvent[] } {
  let state = startState(mode);
  const events: DirectorEvent[] = [];
  for (let step = 0; step < 2000 && state.phase !== 'summary'; step += 1) {
    const moved = state.phase === 'show' ? tap(packs, mode, state) : advance(packs, mode, state, 0.25);
    state = moved.state;
    events.push(...moved.events);
  }
  return { state, events };
}

describe('reveal order', () => {
  it('shows weaker cards first and the best last, keeping the draw order among equals', () => {
    expect(revealOrder(RARE)).toEqual([0, 2, 1, 3, 4]);
    expect(revealOrder(pack('SAR', 'C', 'RR', 'U', 'C'))).toEqual([1, 4, 3, 2, 0]);
    expect(revealOrder(pack('UR', 'UR', 'C', 'AR', 'U'))).toEqual([2, 4, 3, 0, 1]);
  });

  it('knows the best rarity of a pack', () => {
    expect(bestRarity(PLAIN)).toBe('R');
    expect(bestRarity(RARE)).toBe('SAR');
    expect(bestRarity(pack('C', 'UR', 'SAR', 'U', 'AR'))).toBe('UR');
    expect(bestRarity(pack())).toBe('C');
  });
});

describe('phase lengths', () => {
  it('give the best packs a longer flight, because of the five threads', () => {
    expect(phaseDuration('full', RARE, 'flight', 0)).toBeGreaterThan(phaseDuration('full', PLAIN, 'flight', 0));
    expect(phaseDuration('short', RARE, 'flight', 0)).toBe(phaseDuration('short', PLAIN, 'flight', 0));
  });

  it('make a flip of a better card longer, and the short mode shorter', () => {
    const last = RARE.rarities.length - 1;
    expect(phaseDuration('full', RARE, 'flip', last)).toBeGreaterThan(phaseDuration('full', RARE, 'flip', 0));
    expect(phaseDuration('short', RARE, 'flip', last)).toBeLessThan(phaseDuration('full', RARE, 'flip', last));
  });

  it('wait for the player in the show and summary phases', () => {
    expect(phaseDuration('full', PLAIN, 'show', 0)).toBe(Number.POSITIVE_INFINITY);
    expect(phaseDuration('full', PLAIN, 'summary', 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('are zero for the cinematic when the show is off', () => {
    for (const phase of ['intro', 'flight', 'impact'] as const) {
      expect(phaseDuration('off', RARE, phase, 0)).toBe(0);
    }
  });
});

describe('advancing time', () => {
  it('stays in a phase until its time is up and then moves on, reporting the change once', () => {
    const start = startState('full');
    expect(start.phase).toBe('intro');
    const inside = advance([PLAIN], 'full', start, 0.3);
    expect(inside.state.phase).toBe('intro');
    expect(inside.state.time).toBeCloseTo(0.3);
    expect(inside.events).toEqual([]);
    const over = advance([PLAIN], 'full', start, 1);
    expect(over.state.phase).toBe('flight');
    expect(over.state.time).toBeCloseTo(0.1);
    expect(phases(over.events)).toEqual(['flight:0.0']);
  });

  it('can jump over several phases in one long frame without losing an event', () => {
    const result = advance([PLAIN], 'full', startState('full'), 5);
    expect(phases(result.events)).toEqual(['flight:0.0', 'impact:0.0', 'enter:0.0']);
    expect(result.events.filter((event) => event.type === 'impact')).toHaveLength(1);
  });

  it('reports the middle of a flip so the scene can burst there', () => {
    const state: DirectorState = { pack: 0, phase: 'flip', time: 0, card: 4 };
    const half = phaseDuration('full', RARE, 'flip', 4) / 2;
    expect(advance([RARE], 'full', state, half - 0.01).events).toEqual([]);
    expect(advance([RARE], 'full', state, half + 0.01).events).toEqual([{ type: 'flip-midpoint', pack: 0, card: 4 }]);
    const after: DirectorState = { ...state, time: half + 0.1 };
    expect(advance([RARE], 'full', after, 0.1).events).toEqual([]);
  });

  it('does nothing for an empty show', () => {
    expect(advance([], 'full', startState('full'), 5).events).toEqual([]);
  });
});

describe('taps', () => {
  it('skip the cinematic to the burst, then to the first card', () => {
    const intro = tap([RARE], 'full', startState('full'));
    expect(intro.state.phase).toBe('impact');
    expect(intro.events.map((event) => event.type)).toEqual(['phase', 'impact']);
    const impact = tap([RARE], 'full', intro.state);
    expect(impact.state).toMatchObject({ phase: 'enter', card: 0, time: 0 });
  });

  it('finish a flip at once, and send a shown card away', () => {
    const flip: DirectorState = { pack: 0, phase: 'flip', time: 0.1, card: 2 };
    const shown = tap([RARE], 'full', flip);
    expect(shown.state).toMatchObject({ phase: 'show', card: 2 });
    const leaving = tap([RARE], 'full', shown.state);
    expect(leaving.state).toMatchObject({ phase: 'exit', card: 2 });
    const next = tap([RARE], 'full', leaving.state);
    expect(next.state).toMatchObject({ phase: 'enter', card: 3 });
  });

  it('do nothing in the summary', () => {
    const end: DirectorState = { pack: 0, phase: 'summary', time: 3, card: 4 };
    expect(tap([RARE], 'full', end)).toEqual({ state: end, events: [] });
  });
});

describe('a whole show', () => {
  it('shows every card of one pack once and ends in the summary', () => {
    const { state, events } = playThrough([RARE], 'full');
    expect(state.phase).toBe('summary');
    const shown = events.flatMap((event) => (event.type === 'phase' && event.phase === 'flip' ? [event.card] : []));
    expect(shown).toEqual([0, 1, 2, 3, 4]);
    // The cards of the pack come in reveal order: the position counts up, the best card is last.
    expect(revealOrder(RARE).at(-1)).toBe(4);
  });

  it('plays the cinematic of every pack, in order, when several are opened', () => {
    const { state, events } = playThrough([PLAIN, RARE, PLAIN], 'full');
    expect(state.phase).toBe('summary');
    const intros = events.flatMap((event) => (event.type === 'phase' && event.phase === 'intro' ? [event.pack] : []));
    expect(intros).toEqual([1, 2]);
    expect(events.flatMap((event) => (event.type === 'impact' ? [event.pack] : []))).toEqual([0, 1, 2]);
  });

  it('goes straight to the cards when the show is off', () => {
    const start = startState('off');
    expect(start.phase).toBe('enter');
    const { state, events } = playThrough([PLAIN, RARE], 'off');
    expect(state.phase).toBe('summary');
    expect(events.some((event) => event.type === 'impact')).toBe(false);
    expect(phases(events).filter((entry) => entry.startsWith('flip'))).toHaveLength(10);
  });

  it('can be skipped to the summary from anywhere', () => {
    for (const phase of ['intro', 'flight', 'impact', 'enter', 'flip', 'show', 'exit'] as const) {
      const skipped = skipAll({ pack: 1, phase, time: 0.2, card: 2 });
      expect(skipped.state.phase).toBe('summary');
      expect(skipped.events).toHaveLength(1);
    }
    expect(skipAll({ pack: 0, phase: 'summary', time: 0, card: 0 }).events).toEqual([]);
  });
});

describe('helpers', () => {
  it('tells the cinematic phases apart', () => {
    const cinematic: DirectorState['phase'][] = ['intro', 'flight', 'impact'];
    const cards: DirectorState['phase'][] = ['enter', 'flip', 'show', 'exit', 'summary'];
    expect(cinematic.every(isCinematic)).toBe(true);
    expect(cards.some(isCinematic)).toBe(false);
  });

  it('reports progress from 0 to 1 and 1 for phases that wait', () => {
    const state: DirectorState = { pack: 0, phase: 'intro', time: 0.45, card: 0 };
    expect(progress('full', [PLAIN], state)).toBeCloseTo(0.5);
    expect(progress('full', [PLAIN], { ...state, phase: 'show' })).toBe(1);
    expect(progress('off', [PLAIN], { ...state, phase: 'intro' })).toBe(1);
    expect(progress('full', [], state)).toBe(1);
  });
});
