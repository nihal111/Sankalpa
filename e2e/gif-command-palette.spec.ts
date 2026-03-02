import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-command-palette.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-command-palette');
});

test('command palette with Cmd+K', async () => {
  // Open command palette
  await press(page, 'k', { meta: true });
  await page.waitForTimeout(400);

  // Type to filter
  await page.keyboard.type('new', { delay: 50 });
  await page.waitForTimeout(300);

  // Select with arrow and Enter
  await press(page, 'ArrowDown');
  await page.waitForTimeout(200);
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
});
