import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-create-list.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-create-list');
});

test('create list with Cmd+Shift+N', async () => {
  await page.waitForTimeout(500);

  // Create new list
  await press(page, 'n', { meta: true, shift: true });
  await page.waitForSelector('.lists-pane input');
  await page.waitForTimeout(200);
  await page.keyboard.type('Shopping', { delay: 50 });
  await page.waitForTimeout(200);
  await showOverlay(page, '↵');
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(500);

  // Verify list was created
  const lists = await page.locator('.lists-pane .item.list .item-name').allTextContents();
  expect(lists).toContain('Shopping');
});
