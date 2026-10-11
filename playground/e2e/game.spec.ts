import { expect, test } from '@playwright/test';
import { goTo, openGame, openOnePack, turnOffPackAnimation, watchErrors } from './helpers';

const SCREENS: readonly (readonly [menu: string, heading: string])[] = [
  ['Packs', 'Packs'],
  ['Shop', 'Shop'],
  ['Binder', 'Binder'],
  ['Grading', 'Grading'],
  ['Battle', 'Battle'],
  ['Decks', 'Decks'],
  ['Card Dex', 'Card Dex'],
  ['Showcase', 'Showcase'],
  ['Settings', 'Settings'],
];

test('every screen of the menu opens, and the page title follows', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  for (const [menu, heading] of SCREENS) {
    await goTo(page, menu);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page).toHaveTitle(`${menu} · TQQ`);
  }
  expect(errors).toEqual([]);
});

test('a new game starts with money, and a pack costs ¥500 and fills the binder', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await turnOffPackAnimation(page);
  await goTo(page, 'Packs');
  await expect(page.getByText('¥1,500').first()).toBeVisible();

  await openOnePack(page);
  await expect(page.getByText('¥1,000').first()).toBeVisible();

  await goTo(page, 'Binder');
  await expect(page.getByText(/5 cards/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a card can be looked at in 3D, flipped and put in the showcase', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await turnOffPackAnimation(page);
  await openOnePack(page);

  await goTo(page, 'Binder');
  await page.getByRole('list').getByRole('link').first().click();
  await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeVisible();
  await expect(page.getByText('Painting the card …')).toBeHidden({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await page.getByRole('button', { name: 'Put in showcase' }).click();

  await goTo(page, 'Showcase');
  await expect(page.getByText('1 of 6 spots used')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a loose card is sent to Grading and comes back in its slab, which can be sold', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await openGame(page);
  await turnOffPackAnimation(page);
  await openOnePack(page);

  await goTo(page, 'Grading');
  await page.getByRole('list').getByRole('button').first().click();
  await page.getByRole('button', { name: /^Send in for ¥/ }).click();
  await page.getByRole('button', { name: 'Yes, send it in' }).click();

  // The reveal can be skipped at any time; it shows the score and the slab at once.
  const reveal = page.getByRole('dialog', { name: 'Grading' });
  await expect(reveal).toBeVisible();
  await reveal.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(reveal.getByText(/Worth ¥[\d,]+ now/)).toBeVisible();
  await reveal.getByRole('button', { name: 'See the slab' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Graded on/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sell slab · ¥/ })).toBeVisible();

  await goTo(page, 'Grading');
  await page.getByRole('button', { name: 'Your slabs' }).click();
  await expect(page.getByText(/1 slab · worth ¥/)).toBeVisible();

  await page.getByRole('link', { name: /score/ }).first().click();
  await page.getByRole('button', { name: /^Sell slab · ¥/ }).click();
  await page.getByRole('button', { name: 'Yes, sell' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Binder' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a battle can be started with a loaner deck and given up', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await goTo(page, 'Battle');
  await page.getByRole('button', { name: 'Start battle' }).click();

  await expect(page.getByText('Get ready')).toBeVisible();
  await page.getByRole('button', { name: 'Give up' }).click();
  await page.getByRole('button', { name: 'Yes, give up' }).click();

  await expect(page.getByRole('dialog').getByText('Defeat')).toBeVisible();
  await expect(page.getByText('Giving up pays nothing.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the choice of the graphics level is kept', async ({ page }) => {
  await openGame(page, '/settings');
  const graphics = page.getByRole('group', { name: 'Graphics', exact: true });
  await graphics.getByRole('button', { name: 'Low' }).click();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Graphics', exact: true }).getByRole('button', { name: 'Low' })).toHaveAttribute('aria-pressed', 'true');
});
