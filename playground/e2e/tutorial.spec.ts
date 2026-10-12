import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { goTo, openGameWithTutorial, watchErrors } from './helpers';
import { playTutorial, runningTab, shownStep } from './tutorialDriver';

// The introduction: every tab explains itself, step by step, the first time it is opened. It cannot be skipped, and while it runs the
// rest of the menu is shut. The steps themselves are played by `tutorialDriver.ts`, which does what a player does at each step.

const TABS = ['Packs', 'Shop', 'Binder', 'Grading', 'Battle', 'Decks', 'Card Dex', 'Showcase', 'Settings'] as const;

// These tests play whole introductions with 3D shows in them. One after the other, so they do not starve each other (and the rest of the suite).
test.describe.configure({ mode: 'serial' });

function menu(page: Page) {
  return page.getByRole('navigation', { name: 'Main menu' });
}

/** The speech bubble of the introduction. */
function bubble(page: Page) {
  return page.getByRole('region', { name: 'Tutorial' });
}

async function openTab(page: Page, name: string): Promise<void> {
  // A battle on the table hides the menu: leave the table first.
  if (!(await menu(page).isVisible())) {
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Leave the table' }).click();
  }
  await goTo(page, name);
}

test('a new player is taken to the Packs tab and shown around, and the rest of the menu is shut until it is done', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  // The game opens on the Binder; the introduction takes the player to the first pack.
  await openGameWithTutorial(page, '/');
  await expect(bubble(page).getByRole('heading', { name: 'Welcome to TQQ!' })).toBeVisible();
  await expect(page).toHaveURL(/#\/packs$/);
  expect(await runningTab(page)).toBe('packs');

  // Every other entry of the menu is shut, and the page cannot be left by the address either.
  for (const name of TABS.filter((entry) => entry !== 'Packs')) {
    await expect(menu(page).getByRole('link', { name, exact: true })).toHaveAttribute('aria-disabled', 'true');
  }
  await menu(page).getByRole('link', { name: 'Shop', exact: true }).click({ force: true });
  await expect(page).toHaveURL(/#\/packs$/);
  await page.evaluate(() => {
    window.location.hash = '#/battle';
  });
  await expect(page).toHaveURL(/#\/packs$/);

  // There is no way to leave the introduction: no close button, and Escape does nothing.
  await page.keyboard.press('Escape');
  expect(await shownStep(page)).toBe('packs.welcome');
  await expect(page.getByRole('region', { name: 'Tutorial' }).getByRole('button', { name: /close|skip/i })).toHaveCount(0);

  const steps = await playTutorial(page);
  expect(steps[0]).toBe('packs.welcome');
  expect(steps).toContain('packs.tear');
  expect(steps[steps.length - 1]).toBe('packs.done');
  expect(await runningTab(page)).toBeNull();

  // Done: the menu is open again, and the next tab starts its own introduction.
  await expect(menu(page).getByRole('link', { name: 'Shop', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  await goTo(page, 'Settings');
  await expect(page.getByRole('region', { name: 'Tutorial' })).toBeVisible();
  expect(await runningTab(page)).toBe('settings');
  expect(errors).toEqual([]);
});

test('a reload in the middle of an introduction goes on where it stopped', async ({ page }) => {
  await openGameWithTutorial(page, '/packs');
  await expect(bubble(page).getByRole('heading', { name: 'Welcome to TQQ!' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(bubble(page).getByRole('heading', { name: 'Your money' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(bubble(page).getByRole('heading', { name: 'Daily bonus' })).toBeVisible();
  // Let the progress be written down, then open the page again.
  await page.waitForTimeout(500);
  await page.reload();
  await expect(menu(page)).toBeVisible();
  // The two steps that were done are not shown again.
  await expect.poll(() => shownStep(page)).toBe('packs.daily');
  await expect(bubble(page).getByRole('heading', { name: 'Daily bonus' })).toBeVisible();
});

test('every tab explains itself once, from Packs to Settings', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = watchErrors(page);
  await openGameWithTutorial(page, '/');
  const shown: string[] = [];
  for (const name of TABS) {
    if (name !== 'Packs') {
      await openTab(page, name);
      await expect(page.getByRole('region', { name: 'Tutorial' })).toBeVisible({ timeout: 15_000 });
    }
    const steps = await playTutorial(page, { timeoutMs: 200_000 });
    expect(steps.length, `steps of ${name}`).toBeGreaterThan(3);
    shown.push(...steps);
  }
  expect(shown).toContain('shop.buy');
  expect(shown).toContain('binder.flip');
  expect(shown).toContain('grading.result');
  expect(shown).toContain('battle.attack');
  expect(shown).toContain('decks.save');
  expect(shown).toContain('showcase.pick');
  expect(shown).toContain('settings.volume');
  expect(await runningTab(page)).toBeNull();

  // A tab that was done does not start over.
  await openTab(page, 'Shop');
  await page.waitForTimeout(800);
  expect(await runningTab(page)).toBeNull();
  expect(errors).toEqual([]);
});

test('the introduction has no serious accessibility problem', async ({ page }) => {
  test.setTimeout(120_000);
  await openGameWithTutorial(page, '/packs');
  await expect(bubble(page)).toBeVisible();
  const problems: string[] = [];
  // The first steps: a message in the middle, a spot with a button to press, and a step that has to be done (no "Next").
  for (const step of ['packs.welcome', 'packs.wallet', 'packs.daily']) {
    await expect.poll(() => shownStep(page)).toBe(step);
    await page.waitForTimeout(400);
    const result = await new AxeBuilder({ page }).exclude('img').analyze();
    for (const violation of result.violations) {
      if (violation.impact === 'serious' || violation.impact === 'critical') {
        problems.push(`${step}: ${violation.id} (${violation.impact}) on ${violation.nodes[0]?.target.join(' ') ?? ''}`);
      }
    }
    const next = page.getByRole('button', { name: 'Next' });
    if ((await next.count()) > 0) {
      await next.click();
    }
  }
  expect(problems).toEqual([]);
});
