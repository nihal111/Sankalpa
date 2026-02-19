import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, createTask, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  test.setTimeout(15000);
  ({ app, page, dbPath, recorder } = await launchApp('test-smart-inbox-badge.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

test('Smart inbox badge shows correct count as tasks are added', async () => {
  // Inbox is the first smart list item and is selected by default
  const inboxItem = page.locator('.lists-pane .smart-list').first();

  // Initially, inbox is empty — no badge element should exist
  await expect(inboxItem.locator('.item-badge')).toHaveCount(0);

  // Add first task to inbox
  await createTask(page, 'First inbox task');

  // Badge should now show 1
  await expect(inboxItem.locator('.item-badge')).toHaveText('1');

  // Add second task to inbox
  await createTask(page, 'Second inbox task');

  // Badge should now show 2
  await expect(inboxItem.locator('.item-badge')).toHaveText('2');
});
