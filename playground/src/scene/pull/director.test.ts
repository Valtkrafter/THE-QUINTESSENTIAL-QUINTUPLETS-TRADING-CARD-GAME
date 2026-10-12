import { describe, expect, it } from 'vitest';
import type { Rarity } from '../../cards/model';
import {
  advance,
  bestRarity,
  ceremonyBeats,
  ceremonyFor,
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
/** The best card is only Double Rare: a violet pack, no ceremony. */
const VIOLET = pack('C', 'U', 'C', 'RR', 'U');
const RARE = pack('C', 'U', 'C', 'RR', 'SAR');
const INTRO = phaseDuration('full', PLAIN, 'intro', 0);

/** The state right after the player opened the first pack: the storm begins. */
function opened(packs: readonly ShowPack[], mode: PullMode): DirectorState {
  return tap(packs, mode, startState(mode)).state;
}

/** Seconds from the start of a show to the moment its first card starts to enter. */
function cinematicSeconds(p: ShowPack, mode: PullMode): number {
  return (['intro', 'flight', 'impact', 'ceremony'] as const).reduce((sum, phase) => sum + phaseDuration(mode, p, phase, 0), 0);
}

function phases(events: readonly DirectorEvent[]): string[] {
  return events.flatMap((event) => (event.type === 'phase' ? [`${event.phase}:${event.pack}.${event.card}`] : []));
}

/** Plays a show to its end by only letting time pass and tapping when a card waits. */
function playThrough(packs: readonly ShowPack[], mode: PullMode): { state: DirectorState; events: DirectorEvent[] } {
  let state = startState(mode);
  const events: DirectorEvent[] = [];
  for (let step = 0; step < 2000 && state.phase !== 'summary'; step += 1) {
    // The player opens every pack and sends every card on.
    const moved = state.phase === 'show' || state.phase === 'tear' ? tap(packs, mode, state) : advance(packs, mode, state, 0.25);
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

  it('wait for the player at the closed pack, in the show and in the summary', () => {
    for (const mode of ['full', 'short'] as const) {
      expect(phaseDuration(mode, PLAIN, 'tear', 0)).toBe(Number.POSITIVE_INFINITY);
    }
    expect(phaseDuration('full', PLAIN, 'show', 0)).toBe(Number.POSITIVE_INFINITY);
    expect(phaseDuration('full', PLAIN, 'summary', 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('are zero for the cinematic when the show is off', () => {
    for (const phase of ['intro', 'flight', 'impact', 'ceremony'] as const) {
      expect(phaseDuration('off', RARE, phase, 0)).toBe(0);
    }
  });

  it('give the ceremony a length that grows with its stars, and none to the short show or to packs below Art Rare', () => {
    const lengths = (['AR', 'SAR', 'UR'] as const).map((best) => phaseDuration('full', pack('C', 'C', 'U', 'U', best), 'ceremony', 0));
    expect(lengths[0]).toBeGreaterThan(2);
    expect(lengths[1]).toBeGreaterThan(lengths[0] ?? 0);
    expect(lengths[2]).toBeGreaterThan(lengths[1] ?? 0);
    expect(phaseDuration('short', RARE, 'ceremony', 0)).toBe(0);
    expect(phaseDuration('full', VIOLET, 'ceremony', 0)).toBe(0);
  });
});

describe('the ceremony', () => {
  it('has stars only for Art Rare and better, and only in the full show', () => {
    expect(ceremonyFor('full', 'RR')).toBe(0);
    expect(ceremonyFor('full', 'AR')).toBe(3);
    expect(ceremonyFor('full', 'SAR')).toBe(4);
    expect(ceremonyFor('full', 'UR')).toBe(5);
    expect(ceremonyFor('short', 'UR')).toBe(0);
    expect(ceremonyFor('off', 'UR')).toBe(0);
  });

  it('lights the stars one after the other, each after the line is drawn, and fades out when they all shine', () => {
    for (const stars of [3, 4, 5]) {
      const beats = ceremonyBeats(stars);
      expect(beats.lineFrom).toBeLessThan(beats.lineTo);
      expect(beats.firstStar).toBeGreaterThanOrEqual(beats.lineTo);
      const last = beats.firstStar + beats.starGap * (stars - 1);
      expect(beats.fadeFrom).toBeGreaterThan(last + 0.5);
      expect(beats.duration).toBeGreaterThan(beats.fadeFrom);
    }
    expect(ceremonyBeats(5).duration).toBeGreaterThan(ceremonyBeats(3).duration);
  });
});

describe('advancing time', () => {
  it('leaves a closed pack alone, however long it takes to open it', () => {
    const start = startState('full');
    expect(start.phase).toBe('tear');
    const waiting = advance([PLAIN], 'full', start, 3600);
    expect(waiting.state.phase).toBe('tear');
    expect(waiting.events).toEqual([]);
  });

  it('stays in a phase until its time is up and then moves on, reporting the change once', () => {
    const start = opened([PLAIN], 'full');
    expect(start.phase).toBe('intro');
    const inside = advance([PLAIN], 'full', start, 0.3);
    expect(inside.state.phase).toBe('intro');
    expect(inside.state.time).toBeCloseTo(0.3);
    expect(inside.events).toEqual([]);
    const over = advance([PLAIN], 'full', start, INTRO + 0.1);
    expect(over.state.phase).toBe('flight');
    expect(over.state.time).toBeCloseTo(0.1);
    expect(phases(over.events)).toEqual(['flight:0.0']);
  });

  it('can jump over several phases in one long frame without losing an event', () => {
    const result = advance([PLAIN], 'full', opened([PLAIN], 'full'), cinematicSeconds(PLAIN, 'full') + 0.1);
    expect(phases(result.events)).toEqual(['flight:0.0', 'impact:0.0', 'enter:0.0']);
    expect(result.events.filter((event) => event.type === 'impact')).toHaveLength(1);
  });

  it('plays the ceremony between the burst and the first card for Art Rare and better, and for nobody else', () => {
    const through = (p: ShowPack, mode: PullMode) => phases(advance([p], mode, opened([p], mode), cinematicSeconds(p, mode) + 0.1).events);
    expect(through(RARE, 'full')).toEqual(['flight:0.0', 'impact:0.0', 'ceremony:0.0', 'enter:0.0']);
    expect(through(VIOLET, 'full')).toEqual(['flight:0.0', 'impact:0.0', 'enter:0.0']);
    expect(through(RARE, 'short')).toEqual(['flight:0.0', 'impact:0.0', 'enter:0.0']);
  });

  it('reports the middle of a flip so the scene can burst there', () => {
    const state: DirectorState = { pack: 0, phase: 'flip', time: 0, card: 4 };
    const half = phaseDuration('full', RARE, 'flip', 4) / 2;
    expect(advance([RARE], 'full', state, half - 0.01).events).toEqual([]);
    expect(advance([RARE], 'full', state, half + 0.01).events).toEqual([{ type: 'flip-midpoint', pack: 0, card: 4 }]);
    const after: DirectorState = { ...state, time: half + 0.1 };
    expect(advance([RARE], 'full', after, 0.1).events).toEqual([]);
  });

  it('has no time to pass in a show without packs', () => {
    expect(advance([], 'full', startState('full'), 5).events).toEqual([]);
  });
});

describe('taps', () => {
  it('open the pack: the storm begins, and it is reported once', () => {
    const open = tap([VIOLET], 'full', startState('full'));
    expect(open.state).toMatchObject({ phase: 'intro', pack: 0, card: 0, time: 0 });
    expect(phases(open.events)).toEqual(['intro:0.0']);
  });

  it('skip the cinematic to the burst, then to the first card', () => {
    const intro = tap([VIOLET], 'full', opened([VIOLET], 'full'));
    expect(intro.state.phase).toBe('impact');
    expect(intro.events.map((event) => event.type)).toEqual(['phase', 'impact']);
    const impact = tap([VIOLET], 'full', intro.state);
    expect(impact.state).toMatchObject({ phase: 'enter', card: 0, time: 0 });
  });

  it('lead a pack with a ceremony from the burst to the ceremony and only then to the first card', () => {
    const impact = tap([RARE], 'full', opened([RARE], 'full'));
    const ceremony = tap([RARE], 'full', impact.state);
    expect(ceremony.state).toMatchObject({ phase: 'ceremony', card: 0, time: 0 });
    expect(phases(ceremony.events)).toEqual(['ceremony:0.0']);
    const enter = tap([RARE], 'full', ceremony.state);
    expect(enter.state).toMatchObject({ phase: 'enter', card: 0, time: 0 });
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

  it('puts every pack on the table to be torn open, and plays the cinematic of each, in order', () => {
    const { state, events } = playThrough([PLAIN, RARE, PLAIN], 'full');
    expect(state.phase).toBe('summary');
    // The first pack is on the table from the start; the next ones come after the cards of the one before.
    const tears = events.flatMap((event) => (event.type === 'phase' && event.phase === 'tear' ? [event.pack] : []));
    expect(tears).toEqual([1, 2]);
    const intros = events.flatMap((event) => (event.type === 'phase' && event.phase === 'intro' ? [event.pack] : []));
    expect(intros).toEqual([0, 1, 2]);
    expect(events.flatMap((event) => (event.type === 'impact' ? [event.pack] : []))).toEqual([0, 1, 2]);
  });

  it('opens the short show with a pack to tear too', () => {
    expect(startState('short').phase).toBe('tear');
    const { state, events } = playThrough([PLAIN, PLAIN], 'short');
    expect(state.phase).toBe('summary');
    expect(events.flatMap((event) => (event.type === 'phase' && event.phase === 'tear' ? [event.pack] : []))).toEqual([1]);
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
    for (const phase of ['tear', 'intro', 'flight', 'impact', 'ceremony', 'enter', 'flip', 'show', 'exit'] as const) {
      const skipped = skipAll({ pack: 1, phase, time: 0.2, card: 2 });
      expect(skipped.state.phase).toBe('summary');
      expect(skipped.events).toHaveLength(1);
    }
    expect(skipAll({ pack: 0, phase: 'summary', time: 0, card: 0 }).events).toEqual([]);
  });
});

describe('helpers', () => {
  it('tells the cinematic phases apart', () => {
    const cinematic: DirectorState['phase'][] = ['intro', 'flight', 'impact', 'ceremony'];
    const cards: DirectorState['phase'][] = ['tear', 'enter', 'flip', 'show', 'exit', 'summary'];
    expect(cinematic.every(isCinematic)).toBe(true);
    expect(cards.some(isCinematic)).toBe(false);
  });

  it('reports progress from 0 to 1 and 1 for phases that wait', () => {
    const state: DirectorState = { pack: 0, phase: 'intro', time: INTRO / 2, card: 0 };
    expect(progress('full', [PLAIN], state)).toBeCloseTo(0.5);
    expect(progress('full', [PLAIN], { ...state, phase: 'show' })).toBe(1);
    expect(progress('off', [PLAIN], { ...state, phase: 'intro' })).toBe(1);
    expect(progress('full', [PLAIN], { ...state, phase: 'tear' })).toBe(1);
    expect(progress('full', [], state)).toBe(1);
  });
});
