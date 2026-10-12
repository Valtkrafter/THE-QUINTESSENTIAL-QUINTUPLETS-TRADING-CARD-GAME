// What an introduction is made of. Every tab of the menu has a list of steps (see `steps/`). A step lights up one thing on the
// screen, says what to do with it, and is done when the player has really done it (or pressed "Next" for a step that only explains).
// The list is plain data; `engine.ts` decides which step is the current one, and `TutorialHost.tsx` draws it.

import type { BattleState } from '../../battle/types';
import type { Gift } from '../../domain/gifts';
import type { SaveGame } from '../../domain/save';
import type { FrameStyle } from '../../cards/frameStyle';
import type { Preferences, TutorialTab } from '../../state/preferences';

/** What things looked like when the current step began, so a step can ask "did this go up?". */
export interface Baseline {
  readonly yen: number;
  readonly cards: number;
  readonly decks: number;
  readonly showcase: number;
  readonly graded: number;
  readonly frameStyle: FrameStyle;
}

/** The battle, as far as the introduction needs to know it. */
export interface BattleView {
  readonly status: 'idle' | 'playing' | 'over';
  readonly battle: BattleState | null;
  /** The rival is acting: nothing can be done yet. */
  readonly waiting: boolean;
}

/** Everything a step may look at: the game, the page and the route. */
export interface TutorialContext {
  readonly save: SaveGame;
  readonly preferences: Preferences;
  /** The route, like "/packs/odds/booster". */
  readonly location: string;
  readonly battle: BattleView;
  readonly start: Baseline;
  /** The steps of this tab that are done, so a step can wait for another one. */
  readonly done: ReadonlySet<string>;
  /** Things that happened while this tab's introduction ran and are over before a step could see them (an attack in a battle). */
  readonly happened: ReadonlySet<string>;
  /** Is there an element on the page for this selector? */
  has(selector: string): boolean;
  /** The value of the input or select that matches, or null when there is none. */
  value(selector: string): string | null;
  /** Did an element for this selector show up at any time since the step began? */
  seen(selector: string): boolean;
  /** Is the value of the input or select that matches different from what it was when the step began? */
  changed(selector: string): boolean;
}

/** How the player gets past a step. */
export type Goal =
  /** A step that only explains: it has a button. */
  | { readonly kind: 'next' }
  /** The player presses (or clicks) the lit-up thing. */
  | { readonly kind: 'click' }
  /** Something that can be seen in the game or on the page. `latch: false` asks again every moment (for a state that can go away). */
  | { readonly kind: 'when'; readonly done: (context: TutorialContext) => boolean; readonly latch?: boolean };

export type Side = 'above' | 'below' | 'left' | 'right';

export interface TutorialStep {
  /** Unique within the game; starts with the tab ("packs.welcome"). It is what is remembered across a reload. */
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** A CSS selector for the thing to light up (always `[data-tutorial="…"]`), or null for a message in the middle of the page. */
  readonly target: string | null;
  readonly goal: Goal;
  /** The label of the button of a "next" step. */
  readonly button?: string;
  /** What the small line under the text says instead of the usual one ("Press the lit-up spot to go on."). */
  readonly hint?: string;
  /** Darken the rest of the page and let only the target be used. True unless said otherwise. */
  readonly dim?: boolean;
  /** Where the speech bubble goes in relation to the target. Automatic unless said otherwise. */
  readonly side?: Side;
  /** The step is only for some situations (nothing to do, or not possible now). It is left out while this is false. */
  readonly applies?: (context: TutorialContext) => boolean;
  /** The step comes later in any case (a show, a reveal that is not on the screen yet), so "Step 3 of 9" counts it from the start. */
  readonly later?: boolean;
  /** What the player needs for this step and does not have. It is given when the step begins. */
  readonly gifts?: (context: TutorialContext) => readonly Gift[];
  /** The step belongs to this page: when the player is somewhere else, the game takes them there. */
  readonly at?: { readonly match: RegExp; readonly go: string };
  /** The last step of a tab: when it is done, the introduction of the tab is finished. */
  readonly last?: boolean;
}

export interface TabScript {
  /** The page the tab starts at. */
  readonly home: string;
  readonly steps: readonly TutorialStep[];
  /** Show "Step 3 of 9". Off where the steps depend on how the game goes. */
  readonly counter: boolean;
}

export type TutorialScript = Readonly<Record<TutorialTab, TabScript>>;
