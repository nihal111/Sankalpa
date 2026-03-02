import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-nesting.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-nesting');
});

test('nest tasks with Tab and Shift+Tab', async () => {
  // Go to Inbox
  await press(page, '0', { meta: true });
  await page.waitForTimeout(400);

  // Create parent task
  await press(page, 'n', { meta: true });
  await page.waitForTimeout(200);
  await page.keyboard.type('Parent task', { delay: 30 });
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Create child task
  await press(page, 'n', { meta: true });
  await page.waitForTimeout(200);
  await page.keyboard.type('Child task', { delay: 30 });
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Indent child with Tab
  await press(page, 'Tab');
  await page.waitForTimeout(400);

  // Create grandchild task
  await press(page, 'n', { meta: true });
  await page.waitForTimeout(200);
  await page.keyboard.type('Grandchild task', { delay: 30 });
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Indent grandchild twice with Tab (to become child of child)
  await press(page, 'Tab');
  await page.waitForTimeout(300);
  await press(page, 'Tab');
  await page.waitForTimeout(400);

  // Outdent with Shift+Tab
  await press(page, 'Tab', { shift: true });
  await page.waitForTimeout(400);

  // Re-indent to keep as grandchild
  await press(page, 'Tab');
  await page.waitForTimeout(500);
});
