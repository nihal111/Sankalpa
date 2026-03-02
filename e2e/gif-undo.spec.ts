import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-undo.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-undo');
});

test('undo and redo with Cmd+Z', async () => {
  // Go to First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Delete task with Backspace
  await press(page, 'Backspace');
  await page.waitForTimeout(400);

  // Undo with Cmd+Z
  await press(page, 'z', { meta: true });
  await page.waitForTimeout(400);

  // Redo with Cmd+Shift+Z
  await press(page, 'z', { meta: true, shift: true });
  await page.waitForTimeout(500);
});
