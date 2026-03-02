import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-pane-navigation.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

test('pane navigation with arrow keys', async () => {
  await page.waitForTimeout(300);
  
  // Direct list shortcuts: Cmd+number (user lists only)
  await press(page, '1', { meta: true }); // First Project
  await page.waitForTimeout(400);
  
  await press(page, '2', { meta: true }); // Tutorial
  await page.waitForTimeout(400);
  expect(await page.locator('.lists-pane .item.selected .item-name').textContent()).toBe('Tutorial');
  
  // Cycle forward with Ctrl+Tab
  await press(page, 'Tab', { ctrl: true });
  await page.waitForTimeout(400);
  
  await press(page, 'Tab', { ctrl: true });
  await page.waitForTimeout(400);
  
  // Cycle backward with Ctrl+Shift+Tab
  await press(page, 'Tab', { ctrl: true, shift: true });
  await page.waitForTimeout(400);
  
  await press(page, 'Tab', { ctrl: true, shift: true });
  await page.waitForTimeout(400);
  
  // Arrow key navigation between panes
  await press(page, 'ArrowRight');
  await page.waitForTimeout(500);
  expect(await page.locator('.tasks-pane').evaluate(el => el.classList.contains('focused'))).toBe(true);
  
  await press(page, 'ArrowLeft');
  await page.waitForTimeout(500);
  expect(await page.locator('.lists-pane').evaluate(el => el.classList.contains('focused'))).toBe(true);
  
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);
});
