// Small helpers for writing the steps of an introduction.

import type { Goal, TutorialContext } from '../types';

/** The selector of a spot that carries `data-tutorial="name"`. */
export function spot(name: string): string {
  return `[data-tutorial="${name}"]`;
}

/** A step that explains and has a button. */
export const NEXT: Goal = { kind: 'next' };

/** A step the player does by pressing the lit-up spot. */
export const CLICK: Goal = { kind: 'click' };

/** A step that is done when something can be seen in the game or on the page. */
export function when(done: (context: TutorialContext) => boolean, latch = true): Goal {
  return { kind: 'when', done, latch };
}

/** Is the player on a page that starts with this path? */
export function onPage(context: TutorialContext, path: string): boolean {
  return context.location === path || context.location.startsWith(`${path}/`);
}
