import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-search.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-search');
});

test('search with Cmd+Shift+F', async () => {
  // Open search
  await press(page, 'f', { meta: true, shift: true });
  await page.waitForTimeout(400);

  // Type search query
  await page.keyboard.type('welcome', { delay: 50 });
  await page.waitForTimeout(500);

  // Navigate results with arrow
  await press(page, 'ArrowDown');
  await page.waitForTimeout(300);

  // Select with Enter
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
});
