import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

let app: ElectronApplication;
let page: Page;
const testDbPath = path.join(__dirname, 'test.db');

test.beforeAll(async () => {
  // Remove test db if exists
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  
  // Use dev mode if SANKALPA_DEV is set
  const isDev = process.env.SANKALPA_DEV === '1';
  
  app = await electron.launch({
    args: ['.'],
    env: { 
      ...process.env, 
      SANKALPA_DB_PATH: testDbPath,
      NODE_ENV: isDev ? 'development' : 'production',
    },
  });
  page = await app.firstWindow();
  await page.waitForSelector('.lists-pane', { timeout: 10000 });
});

test.afterAll(async () => {
  await app.close();
  // Clean up test db
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

async function press(key: string, opts: { meta?: boolean; shift?: boolean } = {}): Promise<void> {
  console.log(`Pressing: ${opts.meta ? 'Cmd+' : ''}${opts.shift ? 'Shift+' : ''}${key}`);
  
  // Simulate real key sequence: modifier down, key down, key up, modifier up
  if (opts.meta) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true, bubbles: true }));
    });
    await page.waitForTimeout(20);
  }
  if (opts.shift) {
    await page.evaluate(({ meta }) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, metaKey: meta, bubbles: true }));
    }, { meta: opts.meta });
    await page.waitForTimeout(20);
  }
  
  // Key down
  await page.evaluate(({ key, meta, shift }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key, metaKey: meta, shiftKey: shift, bubbles: true,
    }));
  }, { key, meta: opts.meta, shift: opts.shift });
  await page.waitForTimeout(20);
  
  // Key up
  await page.evaluate(({ key, meta, shift }) => {
    window.dispatchEvent(new KeyboardEvent('keyup', {
      key, metaKey: meta, shiftKey: shift, bubbles: true,
    }));
  }, { key, meta: opts.meta, shift: opts.shift });
  await page.waitForTimeout(20);
  
  // Release modifiers
  if (opts.shift) {
    await page.evaluate(({ meta }) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', shiftKey: false, metaKey: meta, bubbles: true }));
    }, { meta: opts.meta });
    await page.waitForTimeout(20);
  }
  if (opts.meta) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', metaKey: false, bubbles: true }));
    });
    await page.waitForTimeout(20);
  }
}

test('Cmd+N from tasks pane moves selection to new task', async () => {
  // Create a list
  await press('n', { meta: true, shift: true });
  await page.waitForSelector('.lists-pane input');
  const listInput = page.locator('.lists-pane input');
  await listInput.fill('Test List');
  await listInput.press('Enter');
  await page.waitForTimeout(100);
  
  // Create first task FROM SIDEBAR
  await press('n', { meta: true });
  await page.waitForSelector('.tasks-pane input');
  await page.locator('.tasks-pane input').fill('Task 1');
  await page.locator('.tasks-pane input').press('Enter');
  await page.waitForTimeout(100);
  
  // Create second task (still from tasks pane now)
  await press('n', { meta: true });
  await page.waitForSelector('.tasks-pane input');
  await page.locator('.tasks-pane input').fill('Task 2');
  await page.locator('.tasks-pane input').press('Enter');
  await page.waitForTimeout(100);
  
  // Now we have 2 tasks, selection should be on Task 2 (index 1)
  // Move UP to Task 1 (index 0)
  await press('ArrowUp');
  await page.waitForTimeout(50);
  
  // Verify Task 1 is selected
  let items = await page.locator('.tasks-pane .item').all();
  console.log('Before Cmd+N - Task count:', items.length);
  for (let i = 0; i < items.length; i++) {
    const isSelected = await items[i].evaluate(el => el.classList.contains('selected'));
    console.log(`  Task ${i} selected:`, isSelected);
  }
  expect(await items[0].evaluate(el => el.classList.contains('selected'))).toBe(true);
  
  // BUG SCENARIO: Create new task while Task 1 is selected
  await press('n', { meta: true });
  await page.waitForSelector('.tasks-pane input');
  
  // The NEW task (index 2) should be selected
  items = await page.locator('.tasks-pane .item').all();
  console.log('After Cmd+N - Task count:', items.length);
  for (let i = 0; i < items.length; i++) {
    const isSelected = await items[i].evaluate(el => el.classList.contains('selected'));
    console.log(`  Task ${i} selected:`, isSelected);
  }
  expect(items.length).toBe(3);
  expect(await items[2].evaluate(el => el.classList.contains('selected'))).toBe(true);
});
