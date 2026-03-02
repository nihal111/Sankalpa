import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-reorder.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-reorder');
});

test('reorder tasks with Alt+arrows', async () => {
  // Go to Tutorial (has many tasks)
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Move down to a middle task
  await press(page, 'ArrowDown');
  await page.waitForTimeout(200);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(200);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(300);

  // Move task up with Alt+Up
  await press(page, 'ArrowUp', { alt: true });
  await page.waitForTimeout(400);

  // Move task down with Alt+Down
  await press(page, 'ArrowDown', { alt: true });
  await page.waitForTimeout(400);
  await press(page, 'ArrowDown', { alt: true });
  await page.waitForTimeout(500);
});
