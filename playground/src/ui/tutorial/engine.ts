// Which step of an introduction the player is at. Pure code: it looks at the list of steps, the steps that are done, the things
// the player has pressed and the state of the game, and says what comes next. The host (`TutorialHost.tsx`) draws the answer.

import type { TutorialContext, TutorialStep } from './types';

/** What the host knows; the engine adds the steps that are done. */
export type ContextWithoutDone = Omit<TutorialContext, 'done'>;

export interface Evaluation {
  /** The step the player is at, or null when no step applies right now (for example while the rival plays). */
  readonly current: TutorialStep | null;
  /** Steps that were found done on the way, in order. The host remembers them. */
  readonly newlyDone: readonly string[];
  /** The last step of the tab is done. */
  readonly finished: boolean;
  /** The page the current step belongs to, when the player is somewhere else. */
  readonly redirect: string | null;
}

/** Does a step stay done once it was done? Yes, except a step that watches a state which can go away again. */
function latches(step: TutorialStep): boolean {
  return step.goal.kind !== 'when' || step.goal.latch !== false;
}

/** Has the player done what the step asks? */
export function isSatisfied(step: TutorialStep, context: TutorialContext, pressed: ReadonlySet<string>): boolean {
  return step.goal.kind === 'when' ? step.goal.done(context) : pressed.has(step.id);
}

/**
 * Goes through the steps in order. A step that is done (or that does not apply now) is passed; the first one that is neither is
 * the current step. `done` holds the steps remembered as done, `pressed` the steps whose button or target the player pressed.
 * Every step gets a context of its own (`contextFor`), so "since this step began" means what it says.
 */
export function evaluate(steps: readonly TutorialStep[], done: ReadonlySet<string>, pressed: ReadonlySet<string>, contextFor: (stepId: string) => ContextWithoutDone): Evaluation {
  const newlyDone: string[] = [];
  // Later steps see the steps that were found done a moment ago, so one step can wait for another.
  const known = new Set(done);
  let finished = false;
  for (const step of steps) {
    if (known.has(step.id)) {
      finished ||= step.last === true;
      continue;
    }
    const context = contextFor(step.id);
    const view: TutorialContext = { ...context, done: known };
    // A step the player has done counts even when it no longer applies (the attack that ended the turn).
    if (isSatisfied(step, view, pressed)) {
      if (latches(step)) {
        newlyDone.push(step.id);
        known.add(step.id);
        finished ||= step.last === true;
      }
      continue;
    }
    if (step.applies !== undefined && !step.applies(view)) {
      continue;
    }
    const elsewhere = step.at !== undefined && !step.at.match.test(context.location);
    return { current: step, newlyDone, finished: false, redirect: elsewhere && step.at !== undefined ? step.at.go : null };
  }
  return { current: null, newlyDone, finished, redirect: null };
}

/** The steps of a tab that count for "Step 3 of 9": those that apply to this player, those that are done and those that are still to come. */
export function countedSteps(steps: readonly TutorialStep[], context: TutorialContext): readonly TutorialStep[] {
  return steps.filter((step) => step.applies === undefined || step.later === true || context.done.has(step.id) || step.applies(context));
}
