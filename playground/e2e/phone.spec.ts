import { expect, test, type Page } from '@playwright/test';
import { goTo, openGame, openGameWithTutorial, openOnePack, turnOffPackAnimation, watchErrors } from './helpers';
import { playTutorial } from './tutorialDriver';

/** Nothing may stick out of the screen sideways: a page that scrolls sideways on a phone is a broken page. */
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('the screens fit a phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await turnOffPackAnimation(page);
  await openOnePack(page);

  for (const menu of ['Packs', 'Shop', 'Binder', 'Grading', 'Battle', 'Decks', 'Card Dex', 'Showcase', 'Settings']) {
    await goTo(page, menu);
    await expect(page.getByRole('heading', { level: 1, name: menu })).toBeVisible();
    await expectNoSidewaysScroll(page);
  }
  expect(errors).toEqual([]);
});

test('the battle table fits a phone, and a card can be pressed and held to see it large', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  await goTo(page, 'Battle');
  await page.getByRole('button', { name: 'Start battle' }).click();
  await expect(page.getByText('Get ready').first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The hand is a row to scroll sideways inside its own box, not a reason for the page to scroll.
  const hand = page.getByRole('list', { name: 'Your hand' });
  await expect(hand.getByRole('button').first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  const first = hand.getByRole('button').first();
  const box = await first.boundingBox();
  if (box === null) {
    throw new Error('The first card of the hand has no place on the screen.');
  }
  await first.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: box.x + 5, clientY: box.y + 5, isPrimary: true, bubbles: true });
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the introduction fits a phone: the bubble stays in the window, and a tab can be shown around', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await openGameWithTutorial(page, '/');
  const bubble = page.getByRole('region', { name: 'Tutorial' });
  await expect(bubble).toBeVisible();
  const size = page.viewportSize();
  if (size === null) {
    throw new Error('The phone has no window size.');
  }
  // Every step of Packs: the bubble is inside the window and the page does not scroll sideways.
  await playTutorial(page, {
    onStep: async (_id, shown) => {
      await shown.waitForTimeout(450);
      const box = await bubble.boundingBox();
      expect(box, 'the bubble has a place on the screen').not.toBeNull();
      if (box !== null) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
      }
      await expectNoSidewaysScroll(shown);
    },
  });
  expect(errors).toEqual([]);
});
