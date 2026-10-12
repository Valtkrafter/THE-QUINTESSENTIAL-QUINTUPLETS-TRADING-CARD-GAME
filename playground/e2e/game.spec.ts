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

test('a new game starts with money, and a Booster costs ¥300 and fills the binder', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await turnOffPackAnimation(page);
  await goTo(page, 'Packs');
  await expect(page.getByText('¥1,500').first()).toBeVisible();

  await openOnePack(page);
  await expect(page.getByText('¥1,200').first()).toBeVisible();

  await goTo(page, 'Binder');
  await expect(page.getByText(/5 cards/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a pack is torn open with a swipe before the show begins, and a tap tears the next one', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await openGame(page);
  await goTo(page, 'Packs');
  await page.getByRole('article', { name: 'TQQ01 Booster' }).getByRole('button', { name: /^Open pack · ¥300$/ }).click();

  // The closed pack lies on the table and waits: nothing happens until the player opens it.
  const pack = page.getByRole('button', { name: /TQQ01 Booster, closed/ });
  await expect(pack).toBeVisible();
  await expect(page.getByText('Swipe across the top to open the pack')).toBeVisible();
  const box = await pack.boundingBox();
  if (box === null) {
    throw new Error('The pack has no place on the screen.');
  }

  // A swipe that stops early lets the strip fall back: the pack is still closed.
  const y = box.y + box.height * 0.2;
  await page.mouse.move(box.x + box.width * 0.1, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await expect(pack).toBeVisible();

  // A swipe across the whole top tears it open: the pack leaves and the show goes on.
  await page.mouse.move(box.x + box.width * 0.1, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 1.05, y, { steps: 12 });
  await page.mouse.up();
  await expect(pack).toBeHidden({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Result' })).toBeVisible();
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
  await expect(reveal.getByText('Worth in its case')).toBeVisible();
  await reveal.getByRole('button', { name: 'See the slab' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Graded on/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sell slab · ¥/ })).toBeVisible();

  await goTo(page, 'Grading');
  await page.getByRole('button', { name: 'Your slabs' }).click();
  await expect(page.getByText('Worth together')).toBeVisible();

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

  await expect(page.getByText('Get ready').first()).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Give up' }).click();
  await page.getByRole('button', { name: 'Yes, give up' }).click();

  await expect(page.getByRole('dialog').getByText('Defeat')).toBeVisible();
  await expect(page.getByText('Giving up pays nothing.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a first-time player is offered the animated explanation, and it plays', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await goTo(page, 'Battle');
  await expect(page.getByText('New to battles?')).toBeVisible();
  await page.getByRole('button', { name: 'Watch how it works' }).click();
  const dialog = page.getByRole('dialog', { name: 'How a turn works' });
  await expect(dialog).toBeVisible();

  // The animation is a page of its own in a frame: its caption changes when a scene is picked.
  const frame = page.frameLocator('iframe[title^="An animation"]');
  await expect(frame.locator('#capt')).toContainText('Setup', { timeout: 15_000 });
  await frame.getByRole('button', { name: '2 · Your turn' }).click();
  await expect(frame.locator('#capt')).toContainText('This is how a turn goes', { timeout: 10_000 });

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test('a battle table tells the player what to do: set up, then the free Heart, then the end of the turn', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await openGame(page);
  await goTo(page, 'Battle');
  await page.getByRole('button', { name: 'Start battle' }).click();

  // The table has its own steps and says what to do. A glowing card of the hand can be played.
  await expect(page.getByText('Click a Basic Character in your hand to put it in front')).toBeVisible();
  for (let round = 0; round < 5; round += 1) {
    const glowing = page.getByRole('list', { name: 'Your hand' }).locator('button[data-playable="true"]');
    if ((await glowing.count()) === 0) {
      break;
    }
    await glowing.first().click();
  }
  await page.getByRole('button', { name: 'Ready', exact: true }).click();

  // The player may go first (no free Hearts and no attack in the very first turn) or second. As soon as free Hearts can be given,
  // the steps point to them.
  const end = page.getByRole('button', { name: 'End turn' });
  const heart = page.getByRole('button', { name: /^Free Heart/ });
  for (let round = 0; round < 2; round += 1) {
    await expect(end).toBeVisible({ timeout: 60_000 });
    if (await heart.isEnabled()) {
      break;
    }
    await end.click();
    await expect(end).toBeHidden();
  }
  await expect(page.getByText('Give your free Hearts: click a Heart on the right, then a Character.')).toBeVisible({ timeout: 60_000 });
  await heart.click();
  // Only the player's own Characters can be picked; the rival's are shown but cannot be clicked.
  const target = page.getByRole('button', { name: /HP, \d+ Hearts?, Active/, disabled: false });
  if ((await page.getByText('Click a glowing Character to give it the Heart.').count()) > 0) {
    await target.first().click();
  }
  await expect(page.getByText(/Heart/).first()).toBeVisible();

  await page.getByRole('button', { name: 'End turn' }).click();
  await expect(page.getByText(/ is playing$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the choice of the graphics level is kept', async ({ page }) => {
  await openGame(page, '/settings');
  const graphics = page.getByRole('group', { name: 'Graphics', exact: true });
  await graphics.getByRole('button', { name: 'Low' }).click();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Graphics', exact: true }).getByRole('button', { name: 'Low' })).toHaveAttribute('aria-pressed', 'true');
});

test('a second window of the game stops when the first one saved, so nothing is overwritten', async ({ context }) => {
  const first = await context.newPage();
  await openGame(first);
  const second = await context.newPage();
  await openGame(second);

  // The second window saves a newer game (the daily bonus) ...
  await goTo(second, 'Packs');
  await second.getByRole('button', { name: /^Claim ¥/ }).click();
  await expect(second.getByText(/daily bonus received/)).toBeVisible();

  // ... so the first one, which holds an older game, asks for a reload instead of ever writing it.
  await expect(first.getByRole('heading', { name: 'The game was changed in another window' })).toBeVisible();
  await first.getByRole('button', { name: 'Reload' }).click();
  await expect(first.getByRole('navigation', { name: 'Main menu' })).toBeVisible();
  await goTo(first, 'Packs');
  await expect(first.getByText('¥1,900').first()).toBeVisible();
});
