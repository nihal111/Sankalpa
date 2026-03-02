import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-complete-task.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-complete-task');
});

test('complete task with Cmd+Enter', async () => {
  // Go to Tutorial list
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Complete task with Cmd+Enter
  await press(page, 'Enter', { meta: true });
  await page.waitForTimeout(500);

  // Verify task is completed
  const completed = await page.locator('.task-item.completed').count();
  expect(completed).toBeGreaterThan(0);

  // Toggle back to incomplete
  await press(page, 'Enter', { meta: true });
  await page.waitForTimeout(500);
});
