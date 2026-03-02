import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-duplicate.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-duplicate');
});

test('duplicate task with Ctrl+D', async () => {
  // Go to First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Duplicate with Ctrl+D
  await press(page, 'd', { ctrl: true });
  await page.waitForTimeout(500);
});
