import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-move.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-move');
});

test('move task with M', async () => {
  // Go to Tutorial list
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Press M to move
  await press(page, 'm');
  await page.waitForTimeout(300);

  // Type to filter to First Project
  await page.keyboard.type('first', { delay: 50 });
  await page.waitForTimeout(300);

  // Select with Enter
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
});
