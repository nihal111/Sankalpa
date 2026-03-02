import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-copy.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-copy');
});

test('copy task with Cmd+C', async () => {
  // Go to Tutorial list
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Copy with Cmd+C
  await press(page, 'c', { meta: true });
  await page.waitForTimeout(500);

  // Go to First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Paste with Cmd+V
  await press(page, 'v', { meta: true });
  await page.waitForTimeout(600);
});
