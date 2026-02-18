import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getSelectedIndices, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-move.db'));
  
  // Setup: create 2 lists, first with tasks
  await createList(page, 'Source List');
  await createTask(page, 'Task to Move');
  await createTask(page, 'Another Task');
  await press(page, 'Tab'); // Back to lists
  await createList(page, 'Target List');
  await press(page, 'ArrowUp'); // Back to Source List
  await press(page, 'Tab'); // To tasks
  await press(page, 'ArrowUp'); // To first task
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

test('M key enters move mode and shows target', async () => {
  await press(page, 'm');
  await page.waitForTimeout(50);
  
  const hint = await page.locator('text=/Move to:/').textContent();
  expect(hint).toContain('Move to:');
  
  // Cancel for next test
  await press(page, 'Escape');
});

test('Arrow navigates move targets and Escape cancels', async () => {
  await press(page, 'm');
  await page.waitForTimeout(50);
  
  const initialHint = await page.locator('text=/Move to:/').textContent();
  
  await press(page, 'ArrowDown');
  await page.waitForTimeout(50);
  
  const newHint = await page.locator('text=/Move to:/').textContent();
  expect(newHint).not.toBe(initialHint);
  
  await press(page, 'Escape');
  await page.waitForTimeout(50);
  
  expect(await page.locator('text=/Move to:/').count()).toBe(0);
});

test('Enter commits move to Target List', async () => {
  await press(page, 'm');
  await page.waitForTimeout(50);
  
  // Navigate until we find Target List
  let hint = await page.locator('text=/Move to:/').textContent();
  let attempts = 0;
  while (!hint?.includes('Target List') && attempts < 10) {
    await press(page, 'ArrowDown');
    await page.waitForTimeout(50);
    hint = await page.locator('text=/Move to:/').textContent();
    attempts++;
  }
  
  expect(hint).toContain('Target List');
  
  await press(page, 'Enter');
  await page.waitForTimeout(200);
  
  expect(await page.locator('text=/Move to:/').count()).toBe(0);
  
  // One task should remain in Source List
  const tasks = await page.locator('.tasks-pane .item').all();
  expect(tasks.length).toBe(1);
});
