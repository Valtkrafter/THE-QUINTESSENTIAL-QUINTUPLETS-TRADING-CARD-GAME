import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the game as a player sees it, in a real browser, against the production build (`npm run test:e2e`).
// They use the Google Chrome that is installed on the machine, in a fresh temporary profile (the player's own profile and
// saves are never touched), so no browser has to be downloaded. TQQ_BROWSER picks another one: `msedge` for Microsoft Edge, or
// `chromium` for Playwright's own (run `npx playwright install chromium` once, for example on a build server).
const choice = process.env['TQQ_BROWSER'] ?? 'chrome';
const channel = choice === 'chromium' ? undefined : choice;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    { name: 'desktop', testIgnore: /phone\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1280, height: 800 } } },
    { name: 'phone', testMatch: /phone\.spec\.ts/, use: { ...devices['Pixel 7'], channel } },
  ],
});
