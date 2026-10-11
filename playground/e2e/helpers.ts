import { expect, type Page } from '@playwright/test';

/** Collects what the page complains about (script errors and console errors), to be checked at the end of a test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console error: ${message.text()}`);
    }
  });
  return errors;
}

/** Opens the game on a page of the hash router and waits until it has loaded (a new browser has a fresh game). */
export async function openGame(page: Page, path = '/'): Promise<void> {
  await page.goto(`/#${path}`);
  await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible();
}

/** Clicks an entry of the main menu. */
export async function goTo(page: Page, name: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name, exact: true }).click();
}

/** Sets the pack animation to "Off", so a pack opens straight to its result. */
export async function turnOffPackAnimation(page: Page): Promise<void> {
  await goTo(page, 'Settings');
  await page.getByRole('group', { name: 'Pack animation' }).getByRole('button', { name: 'Off', exact: true }).click();
}

/** Buys and opens one Booster (¥300), skips the reveal and closes its result. */
export async function openOnePack(page: Page): Promise<void> {
  await goTo(page, 'Packs');
  await page.getByRole('article', { name: 'TQQ01 Booster' }).getByRole('button', { name: /^Open pack · ¥300$/ }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Result' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Result' })).toBeHidden();
}
