import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../state/preferences';
import { newSaveGame } from '../../domain/save';
import { countedSteps, evaluate, type ContextWithoutDone } from './engine';
import type { TutorialStep } from './types';

function context(overrides: Partial<ContextWithoutDone> = {}): ContextWithoutDone {
  const save = newSaveGame('engine', 1_800_000_000_000);
  return {
    save,
    preferences: DEFAULT_PREFERENCES,
    location: '/packs',
    battle: { status: 'idle', battle: null, waiting: false },
    start: { yen: save.player.yen, cards: 0, decks: 0, showcase: 0, graded: 0, frameStyle: 'classic' },
    happened: new Set(),
    has: () => false,
    value: () => null,
    seen: () => false,
    changed: () => false,
    ...overrides,
  };
}

function step(id: string, extra: Partial<TutorialStep> = {}): TutorialStep {
  return { id, title: id, text: id, target: null, goal: { kind: 'next' }, ...extra };
}

const NONE: ReadonlySet<string> = new Set();

describe('the current step', () => {
  it('is the first one that is not done, and stays it until the player presses its button', () => {
    const steps = [step('a'), step('b'), step('c', { last: true })];
    expect(evaluate(steps, NONE, NONE, () => context()).current?.id).toBe('a');
    const after = evaluate(steps, NONE, new Set(['a']), () => context());
    expect(after.newlyDone).toEqual(['a']);
    expect(after.current?.id).toBe('b');
    expect(after.finished).toBe(false);
  });

  it('skips the steps that are remembered as done', () => {
    const steps = [step('a'), step('b'), step('c', { last: true })];
    const result = evaluate(steps, new Set(['a', 'b']), NONE, () => context());
    expect(result.current?.id).toBe('c');
    expect(result.newlyDone).toEqual([]);
  });

  it('finishes when the last step is done, whether it was remembered or just found', () => {
    const steps = [step('a'), step('z', { last: true })];
    expect(evaluate(steps, new Set(['a', 'z']), NONE, () => context())).toMatchObject({ current: null, finished: true });
    expect(evaluate(steps, new Set(['a']), new Set(['z']), () => context())).toMatchObject({ current: null, finished: true, newlyDone: ['z'] });
    expect(evaluate(steps, new Set(['a']), NONE, () => context()).finished).toBe(false);
  });

  it('passes a step whose goal can be seen in the game, in the same moment', () => {
    const steps = [step('a', { goal: { kind: 'when', done: (c) => c.save.player.yen > 0 } }), step('b')];
    const result = evaluate(steps, NONE, NONE, () => context());
    expect(result.newlyDone).toEqual(['a']);
    expect(result.current?.id).toBe('b');
  });

  it('asks a step about a state that can go away every time, and never remembers it', () => {
    let running = true;
    const steps = [step('start', { goal: { kind: 'when', latch: false, done: () => running } }), step('table')];
    const during = evaluate(steps, NONE, NONE, () => context());
    expect(during.current?.id).toBe('table');
    expect(during.newlyDone).toEqual([]);
    running = false;
    expect(evaluate(steps, NONE, NONE, () => context()).current?.id).toBe('start');
  });

  it('leaves out a step that does not apply, and goes on with the next', () => {
    const steps = [step('bonus', { applies: () => false }), step('open')];
    const result = evaluate(steps, NONE, NONE, () => context());
    expect(result.current?.id).toBe('open');
    expect(result.newlyDone).toEqual([]);
  });

  it('lets a step wait for another one, also when that one was found done a moment ago', () => {
    const steps = [
      step('first', { goal: { kind: 'when', done: () => true } }),
      step('second', { applies: (c) => c.done.has('first'), goal: { kind: 'click' } }),
      step('end', { last: true, applies: (c) => c.done.has('second') }),
    ];
    const result = evaluate(steps, NONE, NONE, () => context());
    expect(result.newlyDone).toEqual(['first']);
    expect(result.current?.id).toBe('second');
    expect(evaluate(steps, new Set(['first']), NONE, () => context()).current?.id).toBe('second');
    // The last step does not jump ahead while the one it waits for is open.
    expect(evaluate(steps, new Set(['first']), NONE, () => context()).finished).toBe(false);
  });

  it('counts a step as done when the player did it, even if it no longer applies', () => {
    const steps = [
      step('attack', { applies: (c) => c.location === '/mine', goal: { kind: 'when', done: (c) => c.happened.has('attacked') } }),
      step('end', { last: true, applies: (c) => c.done.has('attack') }),
    ];
    // The attack happened, and it is the rival's turn now: the step does not apply any more, but it is done.
    const result = evaluate(steps, NONE, NONE, () => context({ location: '/theirs', happened: new Set(['attacked']) }));
    expect(result.newlyDone).toEqual(['attack']);
    expect(result.current?.id).toBe('end');
    // Before the attack, nothing applies and the last step does not jump ahead.
    expect(evaluate(steps, NONE, NONE, () => context({ location: '/theirs' }))).toMatchObject({ current: null, finished: false });
  });

  it('is nothing while no step applies', () => {
    const steps = [step('lesson', { applies: () => false })];
    expect(evaluate(steps, NONE, NONE, () => context())).toEqual({ current: null, newlyDone: [], finished: false, redirect: null });
  });

  it('sends the player to the page of the step when they are somewhere else', () => {
    const steps = [step('read', { at: { match: /^\/packs\/odds\//, go: '/packs/odds/booster' } })];
    expect(evaluate(steps, NONE, NONE, () => context({ location: '/packs' })).redirect).toBe('/packs/odds/booster');
    expect(evaluate(steps, NONE, NONE, () => context({ location: '/packs/odds/select' })).redirect).toBeNull();
  });
});

describe('counting the steps', () => {
  it('counts the steps that apply', () => {
    const steps = [step('a'), step('b', { applies: () => false }), step('c'), step('d', { applies: () => false, later: true }), step('e', { applies: () => false })];
    const full = { ...context(), done: NONE };
    expect(countedSteps(steps, full).map((entry) => entry.id)).toEqual(['a', 'c', 'd']);
    // A step that was done counts even when it no longer applies.
    expect(countedSteps(steps, { ...full, done: new Set(['e']) }).map((entry) => entry.id)).toEqual(['a', 'c', 'd', 'e']);
  });
});
