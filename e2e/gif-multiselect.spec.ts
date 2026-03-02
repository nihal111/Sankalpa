import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-multiselect.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-multiselect');
});

test('multi-select with Shift and Ctrl', async () => {
  // Go to Tutorial (has many tasks)
  await press(page, '2', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Contiguous select with Shift+Down
  await press(page, 'ArrowDown', { shift: true });
  await page.waitForTimeout(300);
  await press(page, 'ArrowDown', { shift: true });
  await page.waitForTimeout(400);

  // Verify contiguous selection
  const contiguousCount = await page.locator('.tasks-pane .item.multi-selected').count();
  expect(contiguousCount).toBeGreaterThanOrEqual(2);

  // Clear selection with Space
  await press(page, ' ');
  await page.waitForTimeout(400);

  // Discontiguous: hold Ctrl, move cursor, toggle selection
  // Press Ctrl down and keep it held
  await showOverlay(page, '⌃');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(200);

  // Move cursor with arrow (Ctrl still held)
  await showOverlay(page, '⌃ + ↓');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(300);

  // Toggle selection with Enter (Ctrl still held)
  await showOverlay(page, '⌃ + ↵');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(300);

  // Move and toggle another
  await showOverlay(page, '⌃ + ↓');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(300);

  await showOverlay(page, '⌃ + ↵');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(300);

  // Release Ctrl
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: false, bubbles: true }));
  });
  await page.waitForTimeout(500);

  // Verify discontiguous selection
  const discontiguousCount = await page.locator('.tasks-pane .item.multi-selected').count();
  expect(discontiguousCount).toBeGreaterThanOrEqual(2);
});
