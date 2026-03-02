import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-collapse.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-collapse');
});

test('collapse and expand with C', async () => {
  // Go to Tutorial (has nested tasks)
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Collapse with C
  await press(page, 'c');
  await page.waitForTimeout(500);

  // Expand with C
  await press(page, 'c');
  await page.waitForTimeout(500);
});
