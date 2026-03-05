import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;

test.beforeAll(async () => {
  ({ app, page, dbPath } = await launchApp('test-quick-add-focus.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath);
});

test('quick-add window receives keyboard input immediately', async () => {
  await page.waitForTimeout(500);

  // Trigger quick add via IPC
  const win = await app.browserWindow(page);
  await win.evaluate((w) => w.webContents.send('quick-add'));
  
  // Wait for quick-add window to appear
  await page.waitForSelector('.quick-add-modal', { timeout: 5000 });
  await page.waitForTimeout(300);

  // Type directly without clicking - tests if keyboard focus is working
  await page.keyboard.type('Test task from keyboard');
  await page.waitForTimeout(300);

  // Check if text was entered in the title field
  const titleInput = page.locator('.quick-add-title');
  const value = await titleInput.inputValue();
  
  expect(value).toBe('Test task from keyboard');
});
