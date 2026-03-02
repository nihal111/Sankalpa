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

  // Read clipboard via Electron main process
  const clipboardText = await app.evaluate(async ({ clipboard }) => {
    return clipboard.readText();
  });

  // Go to First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Override clipboard.readText before paste
  await page.evaluate((text) => {
    Object.defineProperty(navigator.clipboard, 'readText', {
      value: async () => {
        console.log('readText called, returning:', text);
        return text;
      },
      writable: true,
      configurable: true
    });
  }, clipboardText);

  // Paste with Cmd+V
  await press(page, 'v', { meta: true });
  await page.waitForTimeout(800);

  // Verify Welcome to Sankalpa appears in First Project
  await expect(page.locator('.tasks-pane .task-item', { hasText: 'Welcome to Sankalpa' })).toBeVisible();
});
