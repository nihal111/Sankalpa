import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getTaskTitles, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-nested-drag.db'));
  
  // Setup: create list with nested structure
  await createList(page, 'Nested Test');
  await createTask(page, 'Parent');
  
  // Create Child and indent it under Parent
  await createTask(page, 'Child');
  await press(page, 'Tab'); // Indent Child under Parent
  await page.waitForTimeout(100);
  
  // Create root tasks C, D, E
  await createTask(page, 'C');
  await createTask(page, 'D');
  await createTask(page, 'E');
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

async function dragTask(page: Page, fromTitle: string, toTitle: string, position: 'before' | 'after'): Promise<void> {
  await page.evaluate(({ fromTitle, toTitle, position }) => {
    const items = Array.from(document.querySelectorAll('.tasks-pane .item'));
    const fromEl = items.find(el => el.textContent?.trim() === fromTitle);
    const toEl = items.find(el => el.textContent?.trim() === toTitle);
    
    if (!fromEl || !toEl) throw new Error(`Could not find tasks: ${fromTitle} or ${toTitle}`);
    
    const toRect = toEl.getBoundingClientRect();
    const clientY = position === 'before' ? toRect.top + 5 : toRect.bottom - 5;
    
    const dt = new DataTransfer();
    
    fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    toEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }));
    toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }));
    fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, { fromTitle, toTitle, position });
  
  await page.waitForTimeout(300);
}

test('drag D before C with nested tasks present', async () => {
  // Initial order: Parent, Child (nested), C, D, E
  const initialTitles = await getTaskTitles(page);
  console.log('Initial order:', initialTitles);
  
  const initialDIndex = initialTitles.indexOf('D');
  const initialCIndex = initialTitles.indexOf('C');
  expect(initialDIndex).toBeGreaterThan(initialCIndex); // D is after C initially
  
  // Drag D before C
  await dragTask(page, 'D', 'C', 'before');
  
  const newTitles = await getTaskTitles(page);
  console.log('After drag:', newTitles);
  
  const newDIndex = newTitles.indexOf('D');
  const newCIndex = newTitles.indexOf('C');
  
  // D should now be before C
  expect(newDIndex).toBeLessThan(newCIndex);
});

test('drag D before C again (repeated reorder)', async () => {
  // After previous test, order should be: Parent, Child, D, C, E
  // Drag D before C again - should stay in same position or move further up
  const beforeTitles = await getTaskTitles(page);
  console.log('Before second drag:', beforeTitles);
  
  // First move C before D to reset
  await dragTask(page, 'C', 'D', 'before');
  await page.waitForTimeout(200);
  
  const resetTitles = await getTaskTitles(page);
  console.log('After reset:', resetTitles);
  
  // Now drag D before C again
  await dragTask(page, 'D', 'C', 'before');
  
  const finalTitles = await getTaskTitles(page);
  console.log('After second drag:', finalTitles);
  
  const dIndex = finalTitles.indexOf('D');
  const cIndex = finalTitles.indexOf('C');
  
  expect(dIndex).toBeLessThan(cIndex);
});

test('many repeated reorders stress test', async () => {
  // Do many reorders back and forth to stress test sort_key precision
  for (let i = 0; i < 10; i++) {
    const beforeTitles = await getTaskTitles(page);
    const dIndex = beforeTitles.indexOf('D');
    const cIndex = beforeTitles.indexOf('C');
    
    if (dIndex > cIndex) {
      // D is after C, drag D before C
      await dragTask(page, 'D', 'C', 'before');
    } else {
      // D is before C, drag C before D
      await dragTask(page, 'C', 'D', 'before');
    }
    
    const afterTitles = await getTaskTitles(page);
    const newDIndex = afterTitles.indexOf('D');
    const newCIndex = afterTitles.indexOf('C');
    
    console.log(`Iteration ${i + 1}: D at ${newDIndex}, C at ${newCIndex}`);
    
    // Verify the swap happened
    if (dIndex > cIndex) {
      expect(newDIndex).toBeLessThan(newCIndex);
    } else {
      expect(newCIndex).toBeLessThan(newDIndex);
    }
  }
}, 10000);
