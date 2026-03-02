import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, getTaskTitles, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-edit-task.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-edit-task');
});

test('edit task with E', async () => {
  // Go to Tutorial list which has tasks
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Press E to edit
  await press(page, 'e');
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.waitForTimeout(200);

  // Clear and type new title
  await page.locator('.tasks-pane .edit-input').fill('');
  await page.keyboard.type('Updated task title', { delay: 50 });
  await page.waitForTimeout(200);

  // Commit with Enter
  await showOverlay(page, '↵');
  await page.locator('.tasks-pane .edit-input').press('Enter');
  await page.waitForTimeout(500);

  // Verify
  const titles = await getTaskTitles(page);
  expect(titles).toContain('Updated task title');
});
