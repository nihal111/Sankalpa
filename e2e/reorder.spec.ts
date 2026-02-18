import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getTaskTitles, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-reorder.db'));
  
  // Setup: create list with 3 tasks
  await createList(page, 'Reorder Test');
  await createTask(page, 'First');
  await createTask(page, 'Second');
  await createTask(page, 'Third');
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp'); // Now at First (index 0)
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

test('Cmd+Shift+Arrow reorders tasks', async () => {
  // Verify initial order
  expect(await getTaskTitles(page)).toEqual(['First', 'Second', 'Third']);
  
  // Reorder First down using Cmd+Shift+Down
  await press(page, 'ArrowDown', { meta: true, shift: true });
  await page.waitForTimeout(150);
  
  expect(await getTaskTitles(page)).toEqual(['Second', 'First', 'Third']);
  
  // Reorder back up
  await press(page, 'ArrowUp', { meta: true, shift: true });
  await page.waitForTimeout(150);
  
  expect(await getTaskTitles(page)).toEqual(['First', 'Second', 'Third']);
});
