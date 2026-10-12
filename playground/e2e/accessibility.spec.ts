import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { goTo, openGame, openOnePack, turnOffPackAnimation } from './helpers';

// axe-core checks what a machine can check of accessibility: names of buttons and images, roles, contrast of text and so on.
// Only what is serious or critical fails a test. The card pictures themselves (the printed art) are left out of the contrast check.
const SCREENS = ['Packs', 'Shop', 'Binder', 'Grading', 'Battle', 'Decks', 'Card Dex', 'Showcase', 'Settings'] as const;

test('no screen has a serious accessibility problem', async ({ page }) => {
  test.setTimeout(180_000);
  await openGame(page);
  await turnOffPackAnimation(page);
  await openOnePack(page);

  const problems: string[] = [];
  for (const menu of SCREENS) {
    await goTo(page, menu);
    await expect(page.getByRole('heading', { level: 1, name: menu })).toBeVisible();
    const result = await new AxeBuilder({ page }).exclude('img').analyze();
    for (const violation of result.violations) {
      if (violation.impact === 'serious' || violation.impact === 'critical') {
        problems.push(`${menu}: ${violation.id} (${violation.impact}) on ${violation.nodes.length} element(s): ${violation.nodes[0]?.target.join(' ') ?? ''} — ${violation.help}`);
      }
    }
  }
  expect(problems).toEqual([]);
});

test('the battle table has no serious accessibility problem either', async ({ page }) => {
  await openGame(page);
  await goTo(page, 'Battle');
  await page.getByRole('button', { name: 'Start battle' }).click();
  await expect(page.getByRole('region', { name: 'Battle table' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Your hand' }).getByRole('button').first()).toBeVisible();
  const result = await new AxeBuilder({ page }).exclude('img').analyze();
  const problems = result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id} (${violation.impact}) on ${violation.nodes.length} element(s): ${violation.nodes[0]?.target.join(' ') ?? ''} — ${violation.help}`);
  expect(problems).toEqual([]);
});
