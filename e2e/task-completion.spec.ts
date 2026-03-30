import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createTask, getTaskTitles, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-completion.db'));
  await press(page, 'Tab');
});

test.afterAll(async () => {
  if (app) await closeApp(app, dbPath, recorder);
});

test('checkboxes, Cmd+Enter completion, and completed smart list wiring', async () => {
  await createTask(page, 'Task 1');
  await createTask(page, 'Task 2');
  await createTask(page, 'Task 3');
  await createTask(page, 'Task 4');
  await createTask(page, 'Task 5');

  await expect(page.locator('.tasks-pane .item input[type="checkbox"]')).toHaveCount(5);

  await press(page, 'Enter', { meta: true });
  await press(page, 'ArrowUp');
  await press(page, 'Enter', { meta: true });
  await press(page, 'ArrowUp');
  await press(page, 'Enter', { meta: true });

  await expect(page.locator('.tasks-pane .task-item.completed')).toHaveCount(0);
  await expect(page.locator('.completed-divider')).toHaveCount(1);
  await expect(page.locator('.completed-divider .divider-label')).toHaveText('3 completed');

  // Navigate to Completed smart list
  await page.locator('.lists-pane .item').filter({ hasText: 'Completed' }).click();
  await press(page, 'Tab');

  await expect(page.locator('.tasks-pane .item')).toHaveCount(3);
  await expect(page.locator('.tasks-pane .item.completed')).toHaveCount(3);
  await expect(page.locator('.tasks-pane h2')).toHaveText('Completed');

  const completedTitles = await getTaskTitles(page);
  expect(completedTitles).toEqual(['Task 3Inbox', 'Task 4Inbox', 'Task 5Inbox']);
});
