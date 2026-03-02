import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, getTaskTitles, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-quick-add.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-quick-add');
});

test('quick add modal keyboard workflow', async () => {
  await page.waitForTimeout(500);

  // Trigger quick add via IPC (simulates global hotkey)
  await showOverlay(page, '⌘⌥⇧Space');
  const win = await app.browserWindow(page);
  await win.evaluate((w) => w.webContents.send('quick-add'));
  await page.waitForSelector('.quick-add-modal');
  await page.waitForTimeout(300);

  // Type task title
  await page.locator('.quick-add-title').type('Review quarterly report', { delay: 50 });
  await page.waitForTimeout(300);

  // Tab to list selector
  await showOverlay(page, '⇥');
  await page.locator('.quick-add-title').press('Tab');
  await page.waitForSelector('.quick-add-dropdown');
  await page.waitForTimeout(300);

  // Enter advances to due date
  await showOverlay(page, '↵');
  await page.locator('.quick-add-dropdown-input').press('Enter');
  await page.waitForTimeout(300);

  // Type due date
  await page.locator('.quick-add-dropdown-input').type('tomorrow', { delay: 50 });
  await page.waitForTimeout(300);

  // Tab advances to duration
  await showOverlay(page, '⇥');
  await page.locator('.quick-add-dropdown-input').press('Tab');
  await page.waitForTimeout(300);

  // Enter selects 15 min and closes
  await showOverlay(page, '↵');
  await page.locator('.quick-add-dropdown-input').press('Enter');
  await page.waitForTimeout(300);

  // Dropdown should be closed
  await expect(page.locator('.quick-add-dropdown')).not.toBeVisible();
  await page.waitForTimeout(200);

  // Submit with Cmd+Enter - use keyboard on page level
  await showOverlay(page, '⌘↵');
  await page.keyboard.press('Meta+Enter');
  await page.waitForTimeout(500);

  // Verify modal closed and task created
  await expect(page.locator('.quick-add-modal')).not.toBeVisible();
  const taskTitles = await getTaskTitles(page);
  expect(taskTitles.some(t => t.includes('Review quarterly report'))).toBe(true);
});
