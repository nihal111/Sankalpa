import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-duration.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-duration');
});

test('set duration with Alt+D', async () => {
  // Go to First Project (has tasks)
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Press Alt+D to set duration
  await press(page, 'd', { alt: true });
  await page.waitForTimeout(300);

  // Type duration
  await page.keyboard.type('30m', { delay: 50 });
  await page.waitForTimeout(200);

  // Commit with Enter
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Verify duration appears
  await expect(page.locator('.task-duration')).toBeVisible();
});
