import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-notes.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-notes');
});

test('edit notes with N', async () => {
  // Go to First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Press N to edit notes
  await press(page, 'n');
  await page.waitForTimeout(300);

  // Type notes
  await page.keyboard.type('Remember to check the docs', { delay: 30 });
  await page.waitForTimeout(200);

  // Commit with Cmd+Enter
  await showOverlay(page, '⌘ + ↵');
  await page.keyboard.press('Meta+Enter');
  await page.waitForTimeout(1000);
});
