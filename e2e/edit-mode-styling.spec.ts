import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-edit-mode-styling.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'edit-mode-styling');
});

test('edit mode shows border and Return to save hint', async () => {
  // Create a task first
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.keyboard.type('Test task');
  await press(page, 'Enter');
  await page.waitForTimeout(300);

  // Press E to enter edit mode
  await press(page, 'e');
  await page.waitForSelector('.tasks-pane .edit-input');

  // Take screenshot to see the border
  await page.screenshot({ path: 'test-recordings/edit-mode-border.png' });

  // Verify the li has editing class with outline
  const editingItem = page.locator('.tasks-pane .item.editing');
  await expect(editingItem).toBeVisible();
  const outline = await editingItem.evaluate((el) => getComputedStyle(el).outline);
  expect(outline).toContain('1px');

  // Verify "Return to save" hint is visible
  const hint = page.locator('.tasks-pane .edit-hint');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText('Return to save');

  // Exit edit mode
  await press(page, 'Enter');
});

test('clicking selected task enters edit mode', async () => {
  // Create a task
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.keyboard.type('Click to edit task');
  await press(page, 'Enter');
  await page.waitForTimeout(300);

  // First click selects and focuses tasks pane
  const taskItem = page.locator('.tasks-pane .task-item').first();
  await taskItem.click();
  await page.waitForTimeout(200);

  // Second click enters edit mode
  await taskItem.click();
  await page.waitForSelector('.tasks-pane .edit-input');

  // Verify edit mode is active
  const editInput = page.locator('.tasks-pane .edit-input');
  await expect(editInput).toBeVisible();

  // Verify hint is shown
  const hint = page.locator('.tasks-pane .edit-hint');
  await expect(hint).toBeVisible();

  // Exit edit mode
  await press(page, 'Escape');
});
