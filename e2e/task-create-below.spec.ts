import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getSelectedIndices, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-create-below.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

async function commitCreatedTask(title: string): Promise<void> {
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.locator('.tasks-pane .edit-input').fill(title);
  await page.locator('.tasks-pane .edit-input').press('Enter');
  await page.waitForTimeout(120);
}

async function createTaskBelowWithTitle(title: string): Promise<void> {
  await press(page, 'n', { meta: true, alt: true });
  await commitCreatedTask(title);
}

async function selectTaskByTitle(title: string): Promise<void> {
  await page.locator('.tasks-pane .item').filter({ hasText: title }).first().click();
  await page.waitForTimeout(60);
}

async function getVisibleTaskTitles(): Promise<string[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('.tasks-pane .task-item .task-content')).map((node) => {
      const el = node as HTMLElement;
      const input = el.querySelector('.edit-input') as HTMLInputElement | null;
      const text = input ? input.value : (el.textContent ?? '');
      return text.replace(/\(\d+\)\s*$/, '').replace(/\u00A0/g, '').trim();
    });
  });
}

test('Cmd+Opt+N inserts root-level sibling and keeps next task title intact', async () => {
  await createList(page, 'Root Sibling Cases');
  await createTask(page, 'Alpha');
  await createTask(page, 'Bravo');
  await createTask(page, 'Charlie');

  await press(page, 'ArrowUp');
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([1]);

  await createTaskBelowWithTitle('Between Bravo and Charlie');

  const titles = await getVisibleTaskTitles();
  expect(titles).toEqual(['Alpha', 'Bravo', 'Between Bravo and Charlie', 'Charlie']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([2]);
});

test('Cmd+Opt+N inserts nested sibling below selected child at same depth', async () => {
  await createList(page, 'Nested Sibling Cases');
  await createTask(page, 'Parent');
  await createTask(page, 'Child A');
  await createTask(page, 'Child B');
  await createTask(page, 'Root Tail');

  await selectTaskByTitle('Child A');
  await press(page, 'Tab');
  await selectTaskByTitle('Child B');
  await press(page, 'Tab');

  expect(await getVisibleTaskTitles()).toEqual(['Parent', 'Child A', 'Child B', 'Root Tail']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([2]);

  await createTaskBelowWithTitle('Child C');

  const titles = await getVisibleTaskTitles();
  expect(titles).toEqual(['Parent', 'Child A', 'Child B', 'Child C', 'Root Tail']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([3]);
});

test('Cmd+Opt+N with a collapsed subtree above target does not overwrite following task', async () => {
  await createList(page, 'Collapsed Above Target');
  await createTask(page, 'Parent');
  await createTask(page, 'Child');
  await createTask(page, 'Target');
  await createTask(page, 'Existing Neighbor');

  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');
  await press(page, 'Tab');
  await press(page, 'ArrowUp');
  await press(page, 'c');
  await press(page, 'ArrowDown');

  expect(await getVisibleTaskTitles()).toEqual(['Parent', 'Target', 'Existing Neighbor']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([1]);

  await createTaskBelowWithTitle('Inserted Sibling');

  const titles = await getVisibleTaskTitles();
  expect(titles).toEqual(['Parent', 'Target', 'Inserted Sibling', 'Existing Neighbor']);
  expect(titles.filter((title) => title === 'Existing Neighbor')).toHaveLength(1);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([2]);
});

test('Cmd+Opt+N in Inbox still inserts below cursor and preserves neighboring titles', async () => {
  await press(page, '0', { meta: true });
  await createTask(page, 'Inbox Parent');
  await createTask(page, 'Inbox Child');
  await createTask(page, 'Inbox Target');
  await createTask(page, 'Inbox Existing');

  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp');
  await press(page, 'Tab');
  await press(page, 'ArrowUp');
  await press(page, 'c');
  await press(page, 'ArrowDown');

  expect(await getVisibleTaskTitles()).toEqual(['Inbox Parent', 'Inbox Target', 'Inbox Existing']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([1]);

  await createTaskBelowWithTitle('Inbox Inserted');

  const titles = await getVisibleTaskTitles();
  expect(titles).toEqual(['Inbox Parent', 'Inbox Target', 'Inbox Inserted', 'Inbox Existing']);
  expect(titles.filter((title) => title === 'Inbox Existing')).toHaveLength(1);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([2]);
});

test('Cmd+Opt+N remains stable with multiple collapsed branches above the target', async () => {
  await createList(page, 'Double Collapsed Branches');
  await createTask(page, 'P1');
  await createTask(page, 'C1');
  await createTask(page, 'P2');
  await createTask(page, 'C2');
  await createTask(page, 'Target');
  await createTask(page, 'Existing Tail');

  await selectTaskByTitle('C1');
  await press(page, 'Tab');
  await selectTaskByTitle('C2');
  await press(page, 'Tab');
  await selectTaskByTitle('P2');
  await press(page, 'c');
  await selectTaskByTitle('P1');
  await press(page, 'c');
  await selectTaskByTitle('Target');

  expect(await getVisibleTaskTitles()).toEqual(['P1', 'P2', 'Target', 'Existing Tail']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([2]);

  await createTaskBelowWithTitle('Inserted After Target');

  const titles = await getVisibleTaskTitles();
  expect(titles).toEqual(['P1', 'P2', 'Target', 'Inserted After Target', 'Existing Tail']);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([3]);
});

test('Repeated Cmd+Opt+N inserts do not overwrite an existing sibling title', async () => {
  await createList(page, 'Repeated Inserts');
  await createTask(page, 'Top');
  await createTask(page, 'Target');
  await createTask(page, 'Stable Neighbor');

  await press(page, 'ArrowUp');
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([1]);

  await createTaskBelowWithTitle('Insert 1');
  await createTaskBelowWithTitle('Insert 2');

  const titles = await getVisibleTaskTitles();
  expect(titles).toEqual(['Top', 'Target', 'Insert 1', 'Insert 2', 'Stable Neighbor']);
  expect(titles.filter((title) => title === 'Stable Neighbor')).toHaveLength(1);
  expect(await getSelectedIndices(page, '.tasks-pane .item')).toEqual([3]);
});
