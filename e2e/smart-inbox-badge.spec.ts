import { test, expect } from '@playwright/test';
import { launchApp, closeApp, createTask } from './helpers';

test.setTimeout(15000);

test('smart inbox badge appears and increments with inbox tasks', async () => {
  const { app, page, dbPath, recorder } = await launchApp('test-smart-inbox-badge.db');

  try {
    const smartInbox = page.locator('.lists-pane .smart-list').first();
    const badge = smartInbox.locator('.item-badge');

    await expect(badge).toHaveCount(0);

    await createTask(page, 'Inbox item 1');
    await expect(badge).toHaveText('1');

    await createTask(page, 'Inbox item 2');
    await expect(badge).toHaveText('2');
  } finally {
    await closeApp(app, dbPath, recorder);
  }
});
