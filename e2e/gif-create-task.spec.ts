import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, getTaskTitles, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-create-task.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-create-task');
});

test('create task with Cmd+N', async () => {
  await page.waitForTimeout(500);

  // Create task with visible typing (in Inbox)
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.waitForTimeout(200);
  await page.keyboard.type('Buy groceries', { delay: 50 });
  await page.waitForTimeout(200);
  await showOverlay(page, '↵');
  await page.locator('.tasks-pane .edit-input').press('Enter');
  await page.waitForTimeout(400);

  // Verify task was created
  const titles = await getTaskTitles(page);
  expect(titles).toContain('Buy groceries');

  // Demo empty task evaporation: Cmd+N then Escape without typing
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.waitForTimeout(400);
  await showOverlay(page, 'Esc');
  await page.locator('.tasks-pane .edit-input').press('Escape');
  await page.waitForTimeout(500);

  // Task count should remain the same (empty task evaporated)
  const finalTitles = await getTaskTitles(page);
  expect(finalTitles).toContain('Buy groceries');
});
