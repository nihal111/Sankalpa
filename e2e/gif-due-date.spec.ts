import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-due-date.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-due-date');
});

test('set due date with D', async () => {
  // Go to Tutorial list
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Press D to set due date
  await press(page, 'd');
  await page.waitForTimeout(300);

  // Type natural language date
  await page.keyboard.type('tmrw 3pm', { delay: 50 });
  await page.waitForTimeout(200);

  // Commit with Enter
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Verify due date appears
  await expect(page.locator('.task-due-date')).toBeVisible();
});
