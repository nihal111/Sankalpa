import { test, expect } from '@playwright/test';
import { launchApp, closeApp, press, createTask, Recorder } from './helpers';
import type { ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeEach(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-trash-delete.db'));
});

test.afterEach(async () => {
  await closeApp(app, dbPath, recorder);
});

test('delete button in trash confirmation dialog works with mouse click', async () => {
  // Create a task
  await createTask(page, 'Task to delete');
  await page.waitForTimeout(100);

  // Delete the task (soft delete to trash)
  await press(page, 'Delete');
  await page.waitForTimeout(100);

  // Navigate to trash
  const trashItem = page.locator('.lists-pane .item:has-text("Trash")');
  await expect(trashItem).toBeVisible();
  await trashItem.click();
  await page.waitForTimeout(100);

  // Switch to tasks pane
  await press(page, 'Tab');
  await page.waitForTimeout(100);

  // Verify task is in trash
  await expect(page.locator('.tasks-pane .item:has-text("Task to delete")')).toBeVisible();

  // Press Delete to trigger permanent delete dialog
  await press(page, 'Delete');
  await page.waitForTimeout(100);

  // Verify confirmation dialog appears
  await expect(page.locator('.confirmation-dialog')).toBeVisible();
  await expect(page.locator('.confirmation-dialog h2')).toHaveText('Permanently Delete');

  // Click the Delete button
  await page.locator('.confirmation-dialog button:has-text("Delete")').click();
  await page.waitForTimeout(100);

  // Verify task is gone
  await expect(page.locator('.tasks-pane .item:has-text("Task to delete")')).not.toBeVisible();
});

test('delete button in trash confirmation dialog works with Enter key', async () => {
  // Create a task
  await createTask(page, 'Task for Enter test');
  await page.waitForTimeout(100);

  // Delete the task (soft delete to trash)
  await press(page, 'Delete');
  await page.waitForTimeout(100);

  // Navigate to trash
  const trashItem = page.locator('.lists-pane .item:has-text("Trash")');
  await expect(trashItem).toBeVisible();
  await trashItem.click();
  await page.waitForTimeout(100);

  // Switch to tasks pane
  await press(page, 'Tab');
  await page.waitForTimeout(100);

  // Verify task is in trash
  await expect(page.locator('.tasks-pane .item:has-text("Task for Enter test")')).toBeVisible();

  // Press Delete to trigger permanent delete dialog
  await press(page, 'Delete');
  await page.waitForTimeout(100);

  // Verify confirmation dialog appears
  await expect(page.locator('.confirmation-dialog')).toBeVisible();

  // Focus the Delete button and press Enter
  await page.locator('.confirmation-dialog button:has-text("Delete")').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);

  // Verify task is gone
  await expect(page.locator('.tasks-pane .item:has-text("Task for Enter test")')).not.toBeVisible();
});
