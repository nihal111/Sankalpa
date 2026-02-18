import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getSelectedIndices, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-multiselect.db'));
  
  // Setup: create list with 3 tasks
  await createList(page, 'Multi Test');
  await createTask(page, 'Task A');
  await createTask(page, 'Task B');
  await createTask(page, 'Task C');
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp'); // Now at Task A (index 0)
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

test('Shift+Arrow extends and contracts selection', async () => {
  // Extend selection down
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, bubbles: true }));
  });
  await page.waitForTimeout(20);
  
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
  });
  await page.waitForTimeout(50);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0, 1]);
  
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
  });
  await page.waitForTimeout(50);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0, 1, 2]);
  
  // Contract selection back
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }));
  });
  await page.waitForTimeout(50);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0, 1]);
  
  // Release Shift - selection should persist
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', shiftKey: false, bubbles: true }));
  });
  await page.waitForTimeout(50);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0, 1]);
  
  // Clear selection for next test
  await press(page, ' ');
});

test('Cmd+Arrow+Enter toggles selection at cursor', async () => {
  // Reset to index 0
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');
  
  // Hold Cmd
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true, bubbles: true }));
  });
  await page.waitForTimeout(20);
  
  // Initial item should be selected
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0]);
  
  // Move cursor down
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true }));
  });
  await page.waitForTimeout(50);
  
  // Toggle selection at cursor (index 1)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }));
  });
  await page.waitForTimeout(50);
  
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0, 1]);
  
  // Release Cmd
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', metaKey: false, bubbles: true }));
  });
  await page.waitForTimeout(50);
  
  // Selection should persist
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([0, 1]);
  
  // Clear
  await press(page, ' ');
});
