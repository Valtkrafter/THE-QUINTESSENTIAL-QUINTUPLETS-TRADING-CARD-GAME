// The timeline of the pull show as plain data: which phase the show is in and how far. It knows nothing about three.js or
// React; the scene reads it every frame and the screen listens to its events. The show never decides what comes out of
// a pack (that was settled before it started), it only plays it.

import type { Rarity } from '../../cards/model';
import { RARITY_IDS } from '../../cards/model';
import { rarityRank, revealLook, threadStrength } from './palette';

/** How much show the player wants: all of it, a short version, or none (cards are revealed straight away). */
export type PullMode = 'full' | 'short' | 'off';

/** One pack as the show sees it: the rarities of its cards in the order they were drawn. */
export interface ShowPack {
  readonly rarities: readonly Rarity[];
}

export type Phase =
  | 'intro' // the sky fades in
  | 'flight' // the shooting star falls (and the five threads weave in for the best packs)
  | 'impact' // flash, shock waves, burst
  | 'enter' // the next card slides in face down
  | 'flip' // the card turns over
  | 'show' // the card waits for a tap
  | 'exit' // the card leaves
  | 'summary'; // everything is revealed

export interface DirectorState {
  readonly pack: number;
  readonly phase: Phase;
  /** Seconds since this phase began. */
  readonly time: number;
  /** Position inside the reveal order of the current pack (0 for the first card shown). */
  readonly card: number;
}

export type DirectorEvent =
  | { readonly type: 'phase'; readonly phase: Phase; readonly pack: number; readonly card: number }
  | { readonly type: 'impact'; readonly pack: number }
  | { readonly type: 'flip-midpoint'; readonly pack: number; readonly card: number };

/** Indices into `ShowPack.rarities`, weaker cards first and the best last, so the pack builds up to its best card. */
export function revealOrder(pack: ShowPack): readonly number[] {
  return pack.rarities
    .map((rarity, index) => ({ rarity, index }))
    .sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.index - b.index)
    .map((entry) => entry.index);
}

export function bestRarity(pack: ShowPack): Rarity {
  return pack.rarities.reduce<Rarity>((best, rarity) => (RARITY_IDS.indexOf(rarity) > RARITY_IDS.indexOf(best) ? rarity : best), 'C');
}

interface Timing {
  readonly intro: number;
  readonly flight: number;
  readonly impact: number;
  readonly enter: number;
  readonly exit: number;
  /** Multiplies the flip time of a card. */
  readonly flip: number;
}

const TIMING: Readonly<Record<PullMode, Timing>> = {
  full: { intro: 0.9, flight: 2.7, impact: 1.0, enter: 0.6, exit: 0.4, flip: 1 },
  short: { intro: 0.15, flight: 1.1, impact: 0.55, enter: 0.3, exit: 0.3, flip: 0.55 },
  off: { intro: 0, flight: 0, impact: 0, enter: 0.25, exit: 0.2, flip: 0.3 },
};

/** Extra flight time for the packs that bring the five threads. */
const THREAD_EXTRA_SECONDS = 1.1;

export function phaseDuration(mode: PullMode, pack: ShowPack, phase: Phase, cardIndex: number): number {
  const timing = TIMING[mode];
  switch (phase) {
    case 'intro':
      return timing.intro;
    case 'flight':
      return timing.flight === 0 ? 0 : timing.flight + (mode === 'full' && threadStrength(bestRarity(pack)) > 0 ? THREAD_EXTRA_SECONDS : 0);
    case 'impact':
      return timing.impact;
    case 'enter':
      return timing.enter;
    case 'flip': {
      const rarity = pack.rarities[revealOrder(pack)[cardIndex] ?? 0] ?? 'C';
      return revealLook(rarity).flipSeconds * timing.flip;
    }
    case 'exit':
      return timing.exit;
    case 'show':
    case 'summary':
      return Number.POSITIVE_INFINITY;
  }
}

/** The phase after `phase`, or 'summary' when the whole show is over. */
function following(packs: readonly ShowPack[], state: DirectorState, mode: PullMode): Pick<DirectorState, 'phase' | 'pack' | 'card'> {
  const pack = packs[state.pack];
  const cards = pack?.rarities.length ?? 0;
  switch (state.phase) {
    case 'intro':
      return { phase: 'flight', pack: state.pack, card: 0 };
    case 'flight':
      return { phase: 'impact', pack: state.pack, card: 0 };
    case 'impact':
      return { phase: 'enter', pack: state.pack, card: 0 };
    case 'enter':
      return { phase: 'flip', pack: state.pack, card: state.card };
    case 'flip':
      return { phase: 'show', pack: state.pack, card: state.card };
    case 'show':
      return { phase: 'exit', pack: state.pack, card: state.card };
    case 'exit':
      if (state.card + 1 < cards) {
        return { phase: 'enter', pack: state.pack, card: state.card + 1 };
      }
      if (state.pack + 1 < packs.length) {
        return { phase: mode === 'off' ? 'enter' : 'intro', pack: state.pack + 1, card: 0 };
      }
      return { phase: 'summary', pack: state.pack, card: state.card };
    case 'summary':
      return { phase: 'summary', pack: state.pack, card: state.card };
  }
}

/** The state the show starts in. With the show turned off it starts at the first card. */
export function startState(mode: PullMode): DirectorState {
  return { pack: 0, phase: mode === 'off' ? 'enter' : 'intro', time: 0, card: 0 };
}

export interface Advance {
  readonly state: DirectorState;
  readonly events: readonly DirectorEvent[];
}

function phaseEvents(from: DirectorState, to: DirectorState): DirectorEvent[] {
  const events: DirectorEvent[] = [];
  if (from.phase !== to.phase || from.pack !== to.pack || from.card !== to.card) {
    events.push({ type: 'phase', phase: to.phase, pack: to.pack, card: to.card });
    if (to.phase === 'impact') {
      events.push({ type: 'impact', pack: to.pack });
    }
  }
  return events;
}

/** Moves the show forward by `seconds`. Phases of length zero are passed through in the same call. */
export function advance(packs: readonly ShowPack[], mode: PullMode, state: DirectorState, seconds: number): Advance {
  let current = state;
  let remaining = Math.max(0, seconds);
  const events: DirectorEvent[] = [];
  for (let guard = 0; guard < 64; guard += 1) {
    const pack = packs[current.pack];
    if (pack === undefined) {
      break;
    }
    const duration = phaseDuration(mode, pack, current.phase, current.card);
    const midpoint = current.phase === 'flip' ? duration * 0.5 : Number.POSITIVE_INFINITY;
    const timeAfter = current.time + remaining;
    if (current.time < midpoint && timeAfter >= midpoint) {
      events.push({ type: 'flip-midpoint', pack: current.pack, card: current.card });
    }
    if (timeAfter < duration) {
      current = { ...current, time: timeAfter };
      remaining = 0;
      break;
    }
    remaining = timeAfter - duration;
    const target = following(packs, current, mode);
    const next: DirectorState = { ...target, time: 0 };
    events.push(...phaseEvents(current, next));
    current = next;
  }
  return { state: current, events };
}

/** A tap on the screen: skips the cinematic, finishes a flip, or sends the shown card away. */
export function tap(packs: readonly ShowPack[], mode: PullMode, state: DirectorState): Advance {
  switch (state.phase) {
    case 'intro':
    case 'flight': {
      // Straight to the burst, so a skipped flight still ends with the flash.
      const impact: DirectorState = { ...state, phase: 'impact', time: 0 };
      return { state: impact, events: phaseEvents(state, impact) };
    }
    case 'impact': {
      const enter: DirectorState = { ...state, phase: 'enter', time: 0, card: 0 };
      return { state: enter, events: phaseEvents(state, enter) };
    }
    case 'enter':
    case 'flip': {
      const show: DirectorState = { ...state, phase: 'show', time: 0 };
      return { state: show, events: phaseEvents(state, show) };
    }
    case 'show': {
      const exit: DirectorState = { ...state, phase: 'exit', time: 0 };
      return { state: exit, events: phaseEvents(state, exit) };
    }
    case 'exit': {
      // Finish the exit right away and start whatever comes next.
      const next: DirectorState = { ...following(packs, state, mode), time: 0 };
      return { state: next, events: phaseEvents(state, next) };
    }
    case 'summary':
      return { state, events: [] };
  }
}

/** Skips everything that is left and goes to the summary. */
export function skipAll(state: DirectorState): Advance {
  if (state.phase === 'summary') {
    return { state, events: [] };
  }
  const summary: DirectorState = { ...state, phase: 'summary', time: 0 };
  return { state: summary, events: [{ type: 'phase', phase: 'summary', pack: state.pack, card: state.card }] };
}

/** True while the cinematic (before the first card of a pack) is running. */
export function isCinematic(phase: Phase): boolean {
  return phase === 'intro' || phase === 'flight' || phase === 'impact';
}

/** Progress 0..1 through the current phase (1 when the phase has no end). */
export function progress(mode: PullMode, packs: readonly ShowPack[], state: DirectorState): number {
  const pack = packs[state.pack];
  if (pack === undefined) {
    return 1;
  }
  const duration = phaseDuration(mode, pack, state.phase, state.card);
  if (!Number.isFinite(duration)) {
    return 1;
  }
  return duration <= 0 ? 1 : Math.min(1, state.time / duration);
}
