import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createTask, createList, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-completed-section.db'));
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

async function dividerLabel(): Promise<string | null> {
  const el = page.locator('.completed-divider .divider-label');
  return (await el.count()) > 0 ? (await el.textContent())?.trim() ?? null : null;
}

test('completing a task moves it to collapsed completed section with divider', async () => {
  await createTask(page, 'Alpha');
  await createTask(page, 'Bravo');
  await createTask(page, 'Charlie');

  // Complete Charlie (selected after creation)
  await press(page, 'Enter', { meta: true });

  await expect(page.locator('.completed-divider')).toHaveCount(1);
  expect(await dividerLabel()).toBe('1 completed');
  expect(await taskTitles()).toEqual(['Alpha', 'Bravo']);
});

test('Enter on divider expands completed section', async () => {
  // Navigate down to the divider (currently on divider after completion)
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await expect(page.locator('.completed-divider.selected')).toHaveCount(1);

  await press(page, 'Enter');
  expect(await taskTitles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  await expect(page.locator('.tasks-pane .task-item.completed')).toHaveCount(1);
});

test('Enter on divider collapses completed section', async () => {
  // After expanding, selection is still on divider (display index 2)
  // Verify we're on the divider
  await expect(page.locator('.completed-divider.selected')).toHaveCount(1);

  await press(page, 'Enter');
  expect(await taskTitles()).toEqual(['Alpha', 'Bravo']);
  await expect(page.locator('.tasks-pane .task-item.completed')).toHaveCount(0);
});

test('uncompleting a task moves it back to incomplete section', async () => {
  // Divider is selected and collapsed. Expand it.
  await expect(page.locator('.completed-divider.selected')).toHaveCount(1);
  await press(page, 'Enter');

  // ArrowDown from divider into completed section → Charlie
  await press(page, 'ArrowDown');
  // Uncomplete Charlie
  await press(page, 'Enter', { meta: true });

  // No divider — all tasks incomplete
  await expect(page.locator('.completed-divider')).toHaveCount(0);
  expect(await taskTitles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
});

test('completed section appears on custom lists', async () => {
  await createList(page, 'My List');
  await createTask(page, 'One');
  await createTask(page, 'Two');

  await press(page, 'Enter', { meta: true });

  await expect(page.locator('.completed-divider')).toHaveCount(1);
  expect(await dividerLabel()).toBe('1 completed');
  expect(await taskTitles()).toEqual(['One']);
});

test('completed section does not appear on Completed smart list', async () => {
  await page.locator('.lists-pane .item').filter({ hasText: 'Completed' }).click();
  await press(page, 'Tab');

  await expect(page.locator('.completed-divider')).toHaveCount(0);
  await expect(page.locator('.tasks-pane .task-item')).not.toHaveCount(0);
});

test('subtree only moves to completed section when root and all children are completed', async () => {
  await createList(page, 'Subtree Test');
  await createTask(page, 'Parent');
  await createTask(page, 'Child');
  // Nest Child under Parent
  await press(page, 'Tab');

  // Complete only the child
  await press(page, 'Enter', { meta: true });

  // No divider — parent is incomplete so subtree stays
  await expect(page.locator('.completed-divider')).toHaveCount(0);
  expect(await taskTitles()).toEqual(['Parent', 'Child']);

  // Complete the parent too (triggers cascade confirmation)
  await press(page, 'ArrowUp');
  await press(page, 'Enter', { meta: true });
  await page.locator('text=Complete All').click();
  await page.waitForTimeout(500);

  // All completed, completedDividerIndex === 0 → auto-expands
  await expect(page.locator('.completed-divider')).toHaveCount(1);
  expect(await taskTitles()).toEqual(['Parent', 'Child']);
});

test('arrow navigation stops at divider when collapsed', async () => {
  await createList(page, 'Nav Test');
  await createTask(page, 'Stay');
  await createTask(page, 'Go');

  // Complete "Go"
  await press(page, 'Enter', { meta: true });

  // Mash ArrowDown — should stop at divider
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await expect(page.locator('.completed-divider.selected')).toHaveCount(1);
});

test('switching lists resets completed section to collapsed', async () => {
  await createList(page, 'Switch Test');
  await createTask(page, 'Visible');
  await createTask(page, 'Hidden');

  // Complete "Hidden"
  await press(page, 'Enter', { meta: true });

  // Navigate to divider and expand
  await press(page, 'ArrowDown');
  await press(page, 'ArrowDown');
  await expect(page.locator('.completed-divider.selected')).toHaveCount(1);
  await press(page, 'Enter');
  expect(await taskTitles()).toEqual(['Visible', 'Hidden']);

  // Switch to a different list and back
  await press(page, 'ArrowLeft');
  await press(page, 'ArrowUp');
  await page.waitForTimeout(300);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(300);
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);

  // Should be collapsed again
  expect(await taskTitles()).toEqual(['Visible']);
  await expect(page.locator('.completed-divider')).toHaveCount(1);
});
