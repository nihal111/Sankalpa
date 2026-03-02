import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-edit-list.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-edit-list');
});

test('edit list with E', async () => {
  // Select First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Press E to edit
  await press(page, 'e');
  await page.waitForSelector('.lists-pane input');
  await page.waitForTimeout(200);

  // Clear and type new name
  await page.locator('.lists-pane input').fill('');
  await page.keyboard.type('Work Tasks', { delay: 50 });
  await page.waitForTimeout(200);

  // Commit with Enter
  await showOverlay(page, '↵');
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(500);

  // Verify
  const lists = await page.locator('.lists-pane .item.list .item-name').allTextContents();
  expect(lists).toContain('Work Tasks');
});
