import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

/**
 * This test replicates the exact scenario from the user's Tutorial list:
 * - D is a root task at the top
 * - Below it are nested tasks (grandchild hierarchy)
 * - A and B are root tasks below the nested structure
 * - Trying to move D between the last nested task and A fails
 */

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-nested-drag-edge.db'));
  
  // Create list using helper
  await press(page, 'n', { meta: true, shift: true });
  await page.waitForSelector('.lists-pane input');
  await page.locator('.lists-pane input').fill('Test List');
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(100);
  
  // Create tasks: D, parent, grandchild, great-grandchild, A, B
  // Then nest grandchild under parent, and great-grandchild under grandchild
  for (const title of ['D', 'parent', 'grandchild', 'great-grandchild', 'A', 'B']) {
    await press(page, 'n', { meta: true });
    await page.waitForSelector('.tasks-pane .edit-input');
    await page.locator('.tasks-pane .edit-input').fill(title);
    await page.locator('.tasks-pane .edit-input').press('Enter');
    await page.waitForTimeout(100);
  }
  
  // Now nest: select grandchild (index 2) and indent
  // Go to top first
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(50);
  
  // Move down to grandchild (index 2)
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(50);
  
  // Indent grandchild to make it child of parent
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  
  // Move down to great-grandchild and indent twice
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(50);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  
  // Go back to top
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(200);
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

async function getTaskTitles(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('.tasks-pane .item'))
      .map(el => el.textContent?.trim() || '');
  });
}

async function dragTask(page: Page, fromTitle: string, toTitle: string, position: 'before' | 'after'): Promise<{ fromIndex: number; toIndex: number }> {
  await page.evaluate(() => { (window as any).__dragDebug = []; });
  
  const result = await page.evaluate(({ fromTitle, toTitle, position }) => {
    const items = Array.from(document.querySelectorAll('.tasks-pane .item'));
    const fromEl = items.find(el => el.textContent?.trim() === fromTitle);
    const toEl = items.find(el => el.textContent?.trim() === toTitle);
    
    if (!fromEl || !toEl) throw new Error(`Could not find tasks: ${fromTitle} or ${toTitle}`);
    
    const fromIndex = items.indexOf(fromEl);
    const toIndex = items.indexOf(toEl);
    
    const dt = new DataTransfer();
    dt.setData('application/x-sankalpa-task', String(fromIndex));
    
    const toRect = toEl.getBoundingClientRect();
    const clientY = position === 'before' ? toRect.top + 5 : toRect.bottom - 5;
    
    fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    toEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }));
    toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }));
    fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    
    return { fromIndex, toIndex };
  }, { fromTitle, toTitle, position });
  
  await page.waitForTimeout(500);
  
  const debug = await page.evaluate(() => (window as any).__dragDebug || []);
  if (debug.length > 0) console.log('Debug:', debug);
  
  return result;
}

test('move D (first root task) to before A (after nested structure)', async () => {
  // Expected visual order:
  // D (index 0)
  // parent (index 1)
  //   grandchild (index 2)
  //     great-grandchild (index 3)
  // A (index 4)
  // B (index 5)
  
  let titles = await getTaskTitles(page);
  console.log('Initial:', titles);
  expect(titles).toEqual(['D', 'parent', 'grandchild', 'great-grandchild', 'A', 'B']);
  
  // Move D to before A
  // Expected result: parent, grandchild, great-grandchild, D, A, B
  const { fromIndex, toIndex } = await dragTask(page, 'D', 'A', 'before');
  console.log(`Dragged from index ${fromIndex} to before index ${toIndex}`);
  
  titles = await getTaskTitles(page);
  console.log('After moving D before A:', titles);
  
  const dIndex = titles.indexOf('D');
  const aIndex = titles.indexOf('A');
  
  expect(dIndex).toBeLessThan(aIndex);
  expect(aIndex - dIndex).toBe(1); // D should be immediately before A
  expect(titles).toEqual(['parent', 'grandchild', 'great-grandchild', 'D', 'A', 'B']);
});

test('move D after great-grandchild (last nested task)', async () => {
  // Current: parent, grandchild, great-grandchild, D, A, B
  // Move D to after great-grandchild should keep it in same position
  // (since D is already right after great-grandchild)
  
  let titles = await getTaskTitles(page);
  console.log('Before:', titles);
  
  // Reset by moving D back to top first
  await dragTask(page, 'D', 'parent', 'before');
  titles = await getTaskTitles(page);
  console.log('After reset:', titles);
  expect(titles[0]).toBe('D');
  
  // Now move D to after great-grandchild
  await dragTask(page, 'D', 'great-grandchild', 'after');
  
  titles = await getTaskTitles(page);
  console.log('After moving D after great-grandchild:', titles);
  
  const dIndex = titles.indexOf('D');
  const ggcIndex = titles.indexOf('great-grandchild');
  const aIndex = titles.indexOf('A');
  
  expect(dIndex).toBeGreaterThan(ggcIndex);
  expect(dIndex).toBeLessThan(aIndex);
});
