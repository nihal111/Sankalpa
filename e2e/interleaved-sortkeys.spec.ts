import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getTaskTitles, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-interleaved-sortkeys.db'));
  
  // Setup: create a scenario where nested task sort_keys get interleaved with root tasks
  // This happens when you create nested tasks, then create root tasks, then reorder
  await createList(page, 'Interleaved Test');
  
  // Create Parent with nested children first
  await createTask(page, 'Parent');
  await createTask(page, 'Child1');
  await press(page, 'Tab'); // Indent Child1 under Parent
  await page.waitForTimeout(100);
  
  await createTask(page, 'Grandchild');
  await press(page, 'Tab'); // Indent Grandchild under Child1
  await page.waitForTimeout(100);
  
  // Now create root tasks - they'll get sort_keys after the nested ones
  await createTask(page, 'A');
  await createTask(page, 'B');
  await createTask(page, 'C');
  await createTask(page, 'D');
  await createTask(page, 'E');
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

async function dragTask(page: Page, fromTitle: string, toTitle: string, position: 'before' | 'after'): Promise<void> {
  // Set up a listener for debug info
  await page.evaluate(() => {
    (window as any).__dragDebug = [];
  });
  
  const debugInfo = await page.evaluate(({ fromTitle, toTitle, position }) => {
    const items = Array.from(document.querySelectorAll('.tasks-pane .item'));
    const fromEl = items.find(el => el.textContent?.trim() === fromTitle);
    const toEl = items.find(el => el.textContent?.trim() === toTitle);
    
    if (!fromEl || !toEl) throw new Error(`Could not find tasks: ${fromTitle} or ${toTitle}`);
    
    const fromIndex = items.indexOf(fromEl);
    const toIndex = items.indexOf(toEl);
    
    const toRect = toEl.getBoundingClientRect();
    const clientY = position === 'before' ? toRect.top + 5 : toRect.bottom - 5;
    
    const dt = new DataTransfer();
    
    // Capture state before drag
    const beforeState = {
      fromIndex,
      toIndex,
      fromTitle,
      toTitle,
      position,
    };
    
    fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    toEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }));
    toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }));
    fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    
    return beforeState;
  }, { fromTitle, toTitle, position });
  
  console.log('Drag debug:', debugInfo);
  
  await page.waitForTimeout(500);
  
  // Get debug info from the page
  const rendererDebug = await page.evaluate(() => (window as any).__dragDebug || []);
  if (rendererDebug.length > 0) {
    console.log('Renderer debug:', rendererDebug);
  }
  
  // Get reload debug info
  const reloadDebug = await page.evaluate(() => (window as any).__reloadDebug);
  if (reloadDebug) {
    console.log('Reload debug:', reloadDebug);
  }
}

test('reorder root tasks multiple times to create interleaved sort_keys', async () => {
  // Initial order: Parent, Child1, Grandchild, A, B, C, D, E
  const initial = await getTaskTitles(page);
  console.log('Initial:', initial);
  
  // Do several reorders to create interleaved sort_keys
  // Move D before A
  await dragTask(page, 'D', 'A', 'before');
  let titles = await getTaskTitles(page);
  console.log('After D before A:', titles);
  expect(titles.indexOf('D')).toBeLessThan(titles.indexOf('A'));
  
  // Move E before B
  await dragTask(page, 'E', 'B', 'before');
  titles = await getTaskTitles(page);
  console.log('After E before B:', titles);
  expect(titles.indexOf('E')).toBeLessThan(titles.indexOf('B'));
  
  // Move C before D
  await dragTask(page, 'C', 'D', 'before');
  titles = await getTaskTitles(page);
  console.log('After C before D:', titles);
  expect(titles.indexOf('C')).toBeLessThan(titles.indexOf('D'));
  
  // Move A before C
  await dragTask(page, 'A', 'C', 'before');
  titles = await getTaskTitles(page);
  console.log('After A before C:', titles);
  expect(titles.indexOf('A')).toBeLessThan(titles.indexOf('C'));
  
  // Move B before A
  await dragTask(page, 'B', 'A', 'before');
  titles = await getTaskTitles(page);
  console.log('After B before A:', titles);
  expect(titles.indexOf('B')).toBeLessThan(titles.indexOf('A'));
});

test('continue reordering after sort_keys are interleaved', async () => {
  // Now try more reorders - this is where the bug would manifest
  let titles = await getTaskTitles(page);
  console.log('Starting state:', titles);
  
  // Debug: get sort_keys from the database
  const sortKeys = await page.evaluate(() => {
    return (window as any).api.tasksGetByList?.('test-list') || 'no api';
  });
  console.log('Sort keys:', sortKeys);
  
  // Try to move D before C
  const dBefore = titles.indexOf('D');
  const cBefore = titles.indexOf('C');
  console.log(`Before: D at ${dBefore}, C at ${cBefore}`);
  
  await dragTask(page, 'D', 'C', 'before');
  
  titles = await getTaskTitles(page);
  const dAfter = titles.indexOf('D');
  const cAfter = titles.indexOf('C');
  console.log(`After: D at ${dAfter}, C at ${cAfter}`);
  console.log('New order:', titles);
  
  // D should now be before C
  expect(dAfter).toBeLessThan(cAfter);
});

test('swap D and C back and forth 5 times', async () => {
  for (let i = 0; i < 5; i++) {
    const titles = await getTaskTitles(page);
    const dIdx = titles.indexOf('D');
    const cIdx = titles.indexOf('C');
    
    console.log(`Iteration ${i + 1} before: D at ${dIdx}, C at ${cIdx}`);
    
    if (dIdx > cIdx) {
      await dragTask(page, 'D', 'C', 'before');
    } else {
      await dragTask(page, 'C', 'D', 'before');
    }
    
    const newTitles = await getTaskTitles(page);
    const newDIdx = newTitles.indexOf('D');
    const newCIdx = newTitles.indexOf('C');
    
    console.log(`Iteration ${i + 1} after: D at ${newDIdx}, C at ${newCIdx}`);
    
    // Verify the swap happened
    if (dIdx > cIdx) {
      expect(newDIdx).toBeLessThan(newCIdx);
    } else {
      expect(newCIdx).toBeLessThan(newDIdx);
    }
  }
});
