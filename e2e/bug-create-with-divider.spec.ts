import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createTask, createList, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-bug-create-divider.db'));
  await press(page, 'Tab');
});

test.afterAll(async () => {
  if (app) await closeApp(app, dbPath, recorder);
});

async function taskTitles(): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.tasks-pane .task-item .task-content'))
      .map(el => (el as HTMLElement).textContent?.trim() ?? '')
  );
}

test('Cmd+N with completed section divider present does not delete tasks', async () => {
  await createList(page, 'Bug Test');
  await createTask(page, 'Alpha');
  await createTask(page, 'Bravo');
  await createTask(page, 'Charlie');

  // Complete Charlie to create the divider
  await press(page, 'Enter', { meta: true });
  await expect(page.locator('.completed-divider')).toHaveCount(1);
  expect(await taskTitles()).toEqual(['Alpha', 'Bravo']);

  // Select Alpha
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');

  // Create a new task below Alpha with Cmd+N
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.locator('.tasks-pane .edit-input').fill('NewTask');
  await page.locator('.tasks-pane .edit-input').press('Enter');
  await page.waitForTimeout(300);

  // All original incomplete tasks should still be present
  const titles = await taskTitles();
  expect(titles).toContain('Alpha');
  expect(titles).toContain('Bravo');
  expect(titles).toContain('NewTask');
  expect(titles).toHaveLength(3);
});

test('Cmd+Opt+Enter (create child) with completed section divider does not delete tasks', async () => {
  await createList(page, 'Bug Test 2');
  await createTask(page, 'Parent');
  await createTask(page, 'Sibling');
  await createTask(page, 'Done');

  // Complete "Done" to create the divider
  await press(page, 'Enter', { meta: true });
  await expect(page.locator('.completed-divider')).toHaveCount(1);
  expect(await taskTitles()).toEqual(['Parent', 'Sibling']);

  // Select Parent
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');

  // Create child with Cmd+Opt+Enter
  await press(page, 'Enter', { meta: true, alt: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.locator('.tasks-pane .edit-input').fill('Child');
  await page.locator('.tasks-pane .edit-input').press('Enter');
  await page.waitForTimeout(300);

  const titles = await taskTitles();
  expect(titles).toContain('Parent');
  expect(titles).toContain('Child');
  expect(titles).toContain('Sibling');
  expect(titles).toHaveLength(3);
});

test('Cmd+N between tasks with divider does not delete the task below', async () => {
  await createList(page, 'Bug Test 3');
  await createTask(page, 'First');
  await createTask(page, 'Second');
  await createTask(page, 'Third');
  await createTask(page, 'Fourth');

  // Complete Fourth to create the divider
  await press(page, 'Enter', { meta: true });
  await expect(page.locator('.completed-divider')).toHaveCount(1);
  expect(await taskTitles()).toEqual(['First', 'Second', 'Third']);

  // Select First
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');

  // Create a new task below First — should insert between First and Second
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.locator('.tasks-pane .edit-input').fill('Inserted');
  await page.locator('.tasks-pane .edit-input').press('Enter');
  await page.waitForTimeout(300);

  const titles = await taskTitles();
  expect(titles).toContain('First');
  expect(titles).toContain('Inserted');
  expect(titles).toContain('Second');
  expect(titles).toContain('Third');
  expect(titles).toHaveLength(4);
});
