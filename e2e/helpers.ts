import { Page, ElectronApplication } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export async function launchApp(testDbName: string): Promise<{ app: ElectronApplication; page: Page; dbPath: string }> {
  const { _electron: electron } = await import('@playwright/test');
  const dbPath = path.join(__dirname, testDbName);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  
  const isDev = process.env.SANKALPA_DEV === '1';
  const headless = process.env.HEADLESS === '1';
  
  const app = await electron.launch({
    args: headless ? ['.', '--test-headless'] : ['.'],
    env: {
      ...process.env,
      SANKALPA_DB_PATH: dbPath,
      NODE_ENV: isDev ? 'development' : 'production',
    },
  });
  
  const page = await app.firstWindow();
  await page.waitForSelector('.lists-pane', { timeout: 10000 });
  return { app, page, dbPath };
}

export async function closeApp(app: ElectronApplication, dbPath: string): Promise<void> {
  await app.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

export async function press(page: Page, key: string, opts: { meta?: boolean; shift?: boolean } = {}): Promise<void> {
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
  
  await page.evaluate(({ key, meta, shift }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: meta, shiftKey: shift, bubbles: true }));
  }, { key, meta: opts.meta, shift: opts.shift });
  await page.waitForTimeout(20);
  
  await page.evaluate(({ key, meta, shift }) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key, metaKey: meta, shiftKey: shift, bubbles: true }));
  }, { key, meta: opts.meta, shift: opts.shift });
  await page.waitForTimeout(20);
  
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

export async function createList(page: Page, name: string): Promise<void> {
  await press(page, 'n', { meta: true, shift: true });
  await page.waitForSelector('.lists-pane input');
  await page.locator('.lists-pane input').fill(name);
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(100);
}

export async function createTask(page: Page, title: string): Promise<void> {
  await press(page, 'n', { meta: true });
  await page.waitForSelector('.tasks-pane input');
  await page.locator('.tasks-pane input').fill(title);
  await page.locator('.tasks-pane input').press('Enter');
  await page.waitForTimeout(100);
}

export async function getSelectedIndices(page: Page, selector: string): Promise<number[]> {
  const items = await page.locator(selector).all();
  const selected: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (await items[i].evaluate(el => el.classList.contains('selected') || el.classList.contains('multi-selected'))) {
      selected.push(i);
    }
  }
  return selected;
}

export async function getTaskTitles(page: Page): Promise<string[]> {
  const items = await page.locator('.tasks-pane .item').all();
  const titles: string[] = [];
  for (const item of items) {
    const text = await item.textContent();
    if (text) titles.push(text.trim());
  }
  return titles;
}
