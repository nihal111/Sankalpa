import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getTaskTitles, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-undo.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

function getSidebarListNames(page: Page): Promise<string[]> {
  return page.locator('.lists-pane .item.list .item-name').allTextContents();
}

async function ensureListsPane(page: Page): Promise<void> {
  const focused = await page.locator('.pane.focused').getAttribute('class');
  if (focused?.includes('tasks-pane')) {
    await press(page, 'Tab');
    await page.waitForTimeout(100);
  }
}

async function selectSidebarItem(page: Page, name: string): Promise<void> {
  await ensureListsPane(page);
  const allItems = await page.locator('.lists-pane .item .item-name').allTextContents();
  const targetIdx = allItems.indexOf(name);
  if (targetIdx < 0) throw new Error(`Sidebar item "${name}" not found in: ${allItems}`);
  const sel = await page.locator('.lists-pane .item.selected .item-name').textContent();
  const curIdx = allItems.indexOf(sel || '');
  const diff = targetIdx - curIdx;
  for (let i = 0; i < Math.abs(diff); i++) {
    await press(page, diff > 0 ? 'ArrowDown' : 'ArrowUp');
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(50);
}

async function dispatchKey(page: Page, key: string, opts?: { metaKey?: boolean }): Promise<void> {
  await page.evaluate(({ key, metaKey }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: !!metaKey, bubbles: true }));
  }, { key, metaKey: opts?.metaKey });
  await page.waitForTimeout(20);
  await page.evaluate(({ key, metaKey }) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key, metaKey: !!metaKey, bubbles: true }));
  }, { key, metaKey: opts?.metaKey });
  await page.waitForTimeout(20);
}

test('undo create list reverts the list creation', async () => {
  await createList(page, 'Shopping');
  let lists = await getSidebarListNames(page);
  expect(lists).toContain('Shopping');

  await press(page, 'z', { meta: true });
  await page.waitForTimeout(300);

  lists = await getSidebarListNames(page);
  expect(lists).not.toContain('Shopping');
});

test('undo create task reverts the task creation', async () => {
  await createList(page, 'Groceries');
  await page.waitForTimeout(100);

  await createTask(page, 'Buy milk');
  let titles = await getTaskTitles(page);
  expect(titles).toContain('Buy milk');

  await press(page, 'z', { meta: true });
  await page.waitForTimeout(300);

  titles = await getTaskTitles(page);
  expect(titles).not.toContain('Buy milk');
});

test('undo rename task reverts to old title', async () => {
  await selectSidebarItem(page, 'Groceries');
  await press(page, 'Tab');
  await page.waitForTimeout(100);

  await createTask(page, 'Buy eggs');
  let titles = await getTaskTitles(page);
  expect(titles).toContain('Buy eggs');

  await press(page, 'Enter');
  await page.waitForSelector('.tasks-pane input.edit-input');
  await page.locator('.tasks-pane input.edit-input').fill('Buy bread');
  await page.locator('.tasks-pane input.edit-input').press('Enter');
  await page.waitForTimeout(200);

  titles = await getTaskTitles(page);
  expect(titles).toContain('Buy bread');

  await press(page, 'z', { meta: true });
  await page.waitForTimeout(500);

  titles = await getTaskTitles(page);
  expect(titles).toContain('Buy eggs');
  expect(titles).not.toContain('Buy bread');
});

test('undo delete task restores the task', async () => {
  // Use a dedicated list for isolation
  await createList(page, 'DeleteTest');
  await page.waitForTimeout(100);

  await createTask(page, 'Doomed Task');
  await page.waitForTimeout(200);

  let titles = await getTaskTitles(page);
  expect(titles).toContain('Doomed Task');

  // Delete using direct dispatch
  await dispatchKey(page, 'Delete');
  await page.waitForTimeout(500);

  titles = await getTaskTitles(page);
  expect(titles).not.toContain('Doomed Task');

  // Undo delete
  await press(page, 'z', { meta: true });
  await page.waitForTimeout(500);

  await selectSidebarItem(page, 'DeleteTest');
  await press(page, 'Tab');
  await page.waitForTimeout(300);

  titles = await getTaskTitles(page);
  expect(titles).toContain('Doomed Task');
});

test('undo rename list reverts to old name', async () => {
  await createList(page, 'RenameMe');
  await page.waitForTimeout(100);

  // Navigate to the list and rename it
  await selectSidebarItem(page, 'RenameMe');
  await page.waitForTimeout(100);

  await press(page, 'Enter');
  await page.waitForSelector('.lists-pane input');
  await page.locator('.lists-pane input').fill('Supermarket');
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(200);

  let lists = await getSidebarListNames(page);
  expect(lists).toContain('Supermarket');

  await press(page, 'z', { meta: true });
  await page.waitForTimeout(500);

  lists = await getSidebarListNames(page);
  expect(lists).toContain('RenameMe');
  expect(lists).not.toContain('Supermarket');
});

test('undo move task reverts the task back to original list', async () => {
  // Create fresh list and task for this test
  await createList(page, 'Source');
  await page.waitForTimeout(100);
  await createTask(page, 'Moveable Task');
  await page.waitForTimeout(100);

  let titles = await getTaskTitles(page);
  expect(titles).toContain('Moveable Task');

  await createList(page, 'Target');
  await page.waitForTimeout(100);

  // Go back to Source
  await selectSidebarItem(page, 'Source');
  await press(page, 'Tab');
  await page.waitForTimeout(200);

  titles = await getTaskTitles(page);
  expect(titles).toContain('Moveable Task');

  // Enter move mode
  await dispatchKey(page, 'm');
  await page.waitForTimeout(200);

  // Navigate to Target
  let hint = await page.locator('text=/Move to:/').textContent();
  let attempts = 0;
  while (!hint?.includes('Target') && attempts < 15) {
    await dispatchKey(page, 'ArrowDown');
    await page.waitForTimeout(100);
    hint = await page.locator('text=/Move to:/').textContent();
    attempts++;
  }
  expect(hint).toContain('Target');

  // Commit move
  await dispatchKey(page, 'Enter');
  await page.waitForTimeout(500);

  // Verify task moved out of Source
  await selectSidebarItem(page, 'Source');
  await press(page, 'Tab');
  await page.waitForTimeout(200);

  titles = await getTaskTitles(page);
  expect(titles).not.toContain('Moveable Task');

  // Undo move
  await press(page, 'z', { meta: true });
  await page.waitForTimeout(500);

  // Navigate back to Source to verify task restored
  await selectSidebarItem(page, 'Source');
  await press(page, 'Tab');
  await page.waitForTimeout(200);

  titles = await getTaskTitles(page);
  expect(titles).toContain('Moveable Task');
});
