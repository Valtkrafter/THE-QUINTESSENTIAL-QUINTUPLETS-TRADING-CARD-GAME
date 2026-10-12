// Plays an introduction like a player does: it looks at which step is shown, does what the step asks, and waits for the next one.
// Every step that is not a "Next" step needs an entry in `DOERS`; a step without one fails the test, so a new step cannot be forgotten.

import type { Locator, Page } from '@playwright/test';

export type Doer = (page: Page) => Promise<void>;

function spot(page: Page, name: string): Locator {
  return page.locator(`[data-tutorial="${name}"]`).first();
}

async function press(page: Page, name: string): Promise<void> {
  await spot(page, name).click();
}

/** Leaves a pack show with its Skip button (the heavy 3D show has tests of its own), or taps through it, until its result is there. */
async function leaveShow(page: Page): Promise<void> {
  const size = page.viewportSize() ?? { width: 1280, height: 800 };
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if ((await page.locator('[data-tutorial="pull-summary"]').count()) > 0) {
      return;
    }
    const skip = page.getByRole('button', { name: 'Skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.click({ timeout: 5_000 }).catch(() => undefined);
    } else {
      await page.mouse.click(size.width / 2, size.height * 0.6);
    }
    await page.waitForTimeout(500);
  }
}

async function playableFirst(page: Page): Promise<void> {
  await page.locator('[data-tutorial="hand"] [data-playable="true"]').first().click();
}

/** What a player does at each step that has no "Next" button. */
export const DOERS: Readonly<Record<string, Doer>> = {
  // Packs
  'packs.daily': (page) => press(page, 'daily-claim'),
  'packs.odds': (page) => press(page, 'odds-booster'),
  'packs.odds-back': (page) => press(page, 'odds-back'),
  'packs.open': (page) => press(page, 'open-booster'),
  'packs.tear': async (page) => {
    await spot(page, 'pack-tear').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(400);
    // A tap on the pack tears it open (the swipe has its own test).
    await page.keyboard.press('Space');
  },
  'packs.show': leaveShow,
  'packs.close': (page) => press(page, 'pull-close'),

  // Binder
  'binder.search': (page) => page.locator('[data-tutorial="binder-search"] input').fill('a'),
  'binder.search-clear': (page) => page.locator('[data-tutorial="binder-search"] input').fill(''),
  'binder.filter': (page) => press(page, 'binder-filter'),
  'binder.filter-pick': (page) => page.locator('[data-tutorial="filter-rarity"] button').first().click(),
  'binder.filter-reset': (page) => press(page, 'filter-reset'),
  'binder.sort': async (page) => {
    await page.locator('[data-tutorial="binder-sort"] select').selectOption('newest');
  },
  'binder.open': (page) => page.locator('[data-tutorial="binder-first-card"] a').first().click(),
  'binder.flip': (page) => press(page, 'card-flip'),
  'binder.back': (page) => press(page, 'card-back'),

  // Shop
  'shop.buy': (page) => press(page, 'kiosk-buy'),
  'shop.sell-tab': (page) => press(page, 'shop-tab-sell'),

  // Grading
  'grading.pick': (page) => page.locator('[data-tutorial="grading-card"] button').first().click(),
  'grading.send': (page) => press(page, 'grading-send'),
  'grading.confirm': (page) => press(page, 'grade-confirm-yes'),
  'grading.ceremony': async (page) => {
    await spot(page, 'ceremony-done').waitFor({ timeout: 20_000 });
  },
  'grading.close': (page) => press(page, 'ceremony-done'),
  'grading.slabs-tab': (page) => press(page, 'grading-tab-slabs'),

  // Decks
  'decks.template': (page) => press(page, 'deck-template'),
  'decks.name': (page) => spot(page, 'deck-name').fill('My first deck'),
  'decks.save': (page) => press(page, 'deck-save'),
  'decks.back': (page) => press(page, 'deck-back'),

  // Card-Dex
  'dex.claim': (page) => press(page, 'dex-claim'),

  // Showcase
  'showcase.add': (page) => page.locator('[data-tutorial="showcase-add"] button').first().click(),
  'showcase.pick': (page) => page.locator('[data-tutorial="showcase-pick"] button').first().click(),

  // Settings
  'settings.frame': (page) => page.locator('[data-tutorial="settings-frame"] button[aria-pressed="false"]').first().click(),
  'settings.volume': (page) =>
    spot(page, 'settings-volume')
      .locator('input')
      .evaluate((input: HTMLInputElement) => {
        input.value = '0.3';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }),

  // Battle
  'battle.watch': (page) => press(page, 'battle-watch'),
  'battle.watching': async (page) => {
    await spot(page, 'explainer').waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  },
  'battle.rival': (page) => press(page, 'battle-rival'),
  'battle.deck': (page) => press(page, 'battle-deck'),
  'battle.start': (page) => press(page, 'battle-start'),
  'battle.active': playableFirst,
  'battle.bench': playableFirst,
  'battle.ready': (page) => press(page, 'battle-ready'),
  'battle.heart': (page) => press(page, 'free-heart'),
  'battle.heart-give': (page) => spot(page, 'pick').click(),
  'battle.attack': (page) => page.locator('[data-tutorial="battle-moves"] button:not([disabled])').first().click(),
  'battle.end-turn': (page) => press(page, 'battle-end'),
  'battle.choose': (page) => spot(page, 'pick').click(),
};

/** The id of the step that is shown, or null. */
export async function shownStep(page: Page): Promise<string | null> {
  return page.evaluate(() => document.querySelector('[data-tutorial-layer]')?.getAttribute('data-step') ?? null);
}

/** Which tab's introduction is running, or null. */
export async function runningTab(page: Page): Promise<string | null> {
  const value = await page.evaluate(() => document.documentElement.dataset['tutorialActive'] ?? '');
  return value === '' ? null : value;
}

export interface PlayOptions {
  /** Called when a step is shown, before the player does anything (for a picture, or a check). */
  readonly onStep?: (id: string, page: Page) => Promise<void>;
  /** How long the whole introduction may take. */
  readonly timeoutMs?: number;
}

/** Does what the step asks: presses its "Next" button, or does what a player does there. */
async function act(page: Page, id: string): Promise<void> {
  const next = page.getByRole('button', { name: /^(Next|Finish)$/ });
  if ((await next.count()) > 0) {
    await next.click();
    return;
  }
  const doer = DOERS[id];
  if (doer === undefined) {
    throw new Error(`No player action for the step ${id}: add it to DOERS in e2e/tutorialDriver.ts.`);
  }
  await doer(page);
}

/**
 * Plays the introduction that is running until it is over. Returns the steps that were shown, in order. Fails when a step has no
 * entry in `DOERS`, when a step does not go away after it was done, or when the time runs out.
 */
export async function playTutorial(page: Page, options: PlayOptions = {}): Promise<string[]> {
  const started = Date.now();
  const limit = options.timeoutMs ?? 120_000;
  const visited: string[] = [];
  let last: string | null = null;
  let since = Date.now();
  let retried = since;
  while ((await runningTab(page)) !== null) {
    if (Date.now() - started > limit) {
      throw new Error(`The tutorial did not finish in ${limit} ms. Last step: ${last ?? 'none'}. Steps so far: ${visited.join(', ')}`);
    }
    const id = await shownStep(page);
    if (id === null) {
      last = null;
      await page.waitForTimeout(120);
      continue;
    }
    if (id !== last) {
      last = id;
      since = Date.now();
      retried = since;
      visited.push(id);
      await options.onStep?.(id, page);
      await act(page, id);
      // The time a step may take to go away starts when the player has done what it asks.
      since = Date.now();
      continue;
    }
    if (Date.now() - since > 20_000) {
      // A picture of where it got stuck helps more than the message.
      await page.screenshot({ path: `test-results/tutorial-stuck-${id}.png` }).catch(() => undefined);
      throw new Error(`The step ${id} did not go away after 20 s. Steps so far: ${visited.join(', ')}`);
    }
    // A "Next" button that did not take the press is pressed again.
    const next = page.getByRole('button', { name: /^(Next|Finish)$/ });
    if (Date.now() - retried > 1_500 && (await next.count()) > 0) {
      retried = Date.now();
      await next.click();
    }
    await page.waitForTimeout(120);
  }
  return visited;
}
