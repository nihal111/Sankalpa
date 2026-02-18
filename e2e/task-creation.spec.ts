import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getSelectedIndices } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;

test.beforeAll(async () => {
  ({ app, page, dbPath } = await launchApp('test-creation.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath);
});

test('Cmd+N from tasks pane moves selection to new task', async () => {
  await createList(page, 'Test List');
  await createTask(page, 'Task 1');
  await createTask(page, 'Task 2');
  
  // Move to Task 1
  await press(page, 'ArrowUp');
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0]);
  
  // Create new task - should select it (index 2)
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane input');
  
  const items = await page.locator('.tasks-pane .item').all();
  expect(items.length).toBe(3);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([2]);
});
