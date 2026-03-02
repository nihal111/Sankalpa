import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder, showOverlay } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-collapse.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-collapse');
});

test('collapse and expand with C', async () => {
  // Go to First Project
  await press(page, '1', { meta: true });
  await page.waitForTimeout(400);

  // Move to tasks pane
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Create parent task
  await press(page, 'n', { meta: true });
  await page.keyboard.type('Parent', { delay: 30 });
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Create child task
  await press(page, 'n', { meta: true });
  await page.keyboard.type('Child', { delay: 30 });
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);

  // Indent child under parent
  await press(page, 'Tab');
  await page.waitForTimeout(300);

  // Create grandchild task
  await press(page, 'n', { meta: true });
  await page.keyboard.type('Grandchild', { delay: 30 });
  await showOverlay(page, '↵');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);

  // Indent grandchild under child (2 levels)
  await press(page, 'Tab');
  await press(page, 'Tab');
  await page.waitForTimeout(400);

  // Move to Child (has 1 subtask)
  await press(page, 'ArrowUp');
  await page.waitForTimeout(300);

  // Collapse Child
  await press(page, 'c');
  await page.waitForTimeout(500);

  // Expand Child
  await press(page, 'c');
  await page.waitForTimeout(400);

  // Move to Parent (has 2 subtasks)
  await press(page, 'ArrowUp');
  await page.waitForTimeout(300);

  // Collapse Parent
  await press(page, 'c');
  await page.waitForTimeout(500);

  // Expand Parent
  await press(page, 'c');
  await page.waitForTimeout(500);
});
