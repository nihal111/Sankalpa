import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getTaskTitles } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;

test.beforeAll(async () => {
  ({ app, page, dbPath } = await launchApp('test-latency.db'));

  await createList(page, 'Latency Test');
  await createTask(page, 'Alpha');
  await createTask(page, 'Beta');
  await createTask(page, 'Gamma');
  await press(page, 'ArrowUp');
  await press(page, 'ArrowUp'); // At Alpha (index 0)
});

test.afterAll(async () => {
  await closeApp(app, dbPath);
});

test('reorder latency is under 200ms', async () => {
  expect(await getTaskTitles(page)).toEqual(['Alpha', 'Beta', 'Gamma']);

  const latency = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const list = document.querySelector('.tasks-pane .item-list')!;
      const start = performance.now();
      const observer = new MutationObserver(() => {
        resolve(performance.now() - start);
        observer.disconnect();
      });
      observer.observe(list, { childList: true, subtree: true, characterData: true });

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown', metaKey: true, shiftKey: true, bubbles: true,
      }));
    });
  });

  console.log(`Reorder latency: ${latency.toFixed(1)}ms`);
  expect(latency).toBeLessThan(200);

  // Verify it actually reordered
  expect(await getTaskTitles(page)).toEqual(['Beta', 'Alpha', 'Gamma']);
});

test('task creation latency is under 200ms', async () => {
  const latency = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const list = document.querySelector('.tasks-pane .item-list')!;
      const start = performance.now();
      const observer = new MutationObserver(() => {
        resolve(performance.now() - start);
        observer.disconnect();
      });
      observer.observe(list, { childList: true, subtree: true });

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'n', metaKey: true, bubbles: true,
      }));
    });
  });

  console.log(`Task creation latency: ${latency.toFixed(1)}ms`);
  expect(latency).toBeLessThan(200);
});
