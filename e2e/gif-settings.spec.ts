import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-settings.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-settings');
});

test('settings with Cmd+comma', async () => {
  // Open settings
  await press(page, ',', { meta: true });
  await page.waitForTimeout(500);

  // Navigate with arrows
  await press(page, 'ArrowDown');
  await page.waitForTimeout(300);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(300);

  // Close with Escape
  await showOverlay(page, 'Esc');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
});
