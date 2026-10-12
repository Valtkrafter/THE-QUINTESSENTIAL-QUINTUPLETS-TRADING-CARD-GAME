// Which tab of the menu a page belongs to, and which introduction is due. Pure code.

import { TUTORIAL_TABS, type TutorialTab } from '../../state/preferences';

/** The page every tab starts at. */
export const HOME: Readonly<Record<TutorialTab, string>> = {
  packs: '/packs',
  shop: '/shop',
  binder: '/',
  grading: '/grading',
  battle: '/battle',
  decks: '/decks',
  dex: '/dex',
  showcase: '/showcase',
  settings: '/settings',
};

/** The tab a page belongs to: "/packs/odds/booster" is Packs, "/card/…" (the inspect view) is the Binder. */
export function tabOf(location: string): TutorialTab | null {
  if (location === '/' || location.startsWith('/card/')) {
    return 'binder';
  }
  const first = location.split('/')[1];
  return TUTORIAL_TABS.find((tab) => tab === first && tab !== 'binder') ?? null;
}

/** The first introduction every player goes through: there are no cards to talk about before the first pack. */
export const FIRST_TAB: TutorialTab = 'packs';

/**
 * The introduction that has to run now, or null. Until the Packs introduction is done, that is the one that runs, wherever the
 * player is; after that, the introduction of the tab the player is on, when it has not been done.
 */
export function tabToStart(location: string, done: readonly TutorialTab[]): TutorialTab | null {
  if (!done.includes(FIRST_TAB)) {
    return FIRST_TAB;
  }
  const tab = tabOf(location);
  return tab !== null && !done.includes(tab) ? tab : null;
}

/** Is the menu entry of `tab` shut? While an introduction runs, only its own tab is open. */
export function isLocked(active: TutorialTab | null, tab: TutorialTab): boolean {
  return active !== null && active !== tab;
}
