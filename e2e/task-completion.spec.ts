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

  await expect(page.locator('.tasks-pane .item.completed')).toHaveCount(3);

  await press(page, 'Tab');
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await press(page, 'Tab');

  await expect(page.locator('.tasks-pane .item')).toHaveCount(3);
  await expect(page.locator('.tasks-pane .item.completed')).toHaveCount(3);
  await expect(page.locator('.tasks-pane h2')).toHaveText('Completed');

  const completedTitles = await getTaskTitles(page);
  expect(completedTitles).toEqual(['Task 3', 'Task 4', 'Task 5']);
});
