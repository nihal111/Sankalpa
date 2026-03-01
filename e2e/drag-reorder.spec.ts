import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createList, createTask, getTaskTitles, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-drag-reorder.db'));
  
  // Setup: create list with 5 tasks (A, B, C, D, E)
  await createList(page, 'Drag Test');
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
  // Dispatch HTML5 drag events manually since Playwright's dragTo doesn't work well with Electron
  await page.evaluate(({ fromTitle, toTitle, position }) => {
    const items = Array.from(document.querySelectorAll('.tasks-pane .item'));
    const fromEl = items.find(el => el.textContent?.trim() === fromTitle);
    const toEl = items.find(el => el.textContent?.trim() === toTitle);
    
    if (!fromEl || !toEl) throw new Error(`Could not find tasks: ${fromTitle} or ${toTitle}`);
    
    const toRect = toEl.getBoundingClientRect();
    const clientY = position === 'before' ? toRect.top + 5 : toRect.bottom - 5;
    
    // Create a mock DataTransfer
    const dt = new DataTransfer();
    
    // Dispatch dragstart on source
    fromEl.dispatchEvent(new DragEvent('dragstart', { 
      bubbles: true, 
      cancelable: true, 
      dataTransfer: dt 
    }));
    
    // Dispatch dragover on target
    toEl.dispatchEvent(new DragEvent('dragover', { 
      bubbles: true, 
      cancelable: true, 
      dataTransfer: dt,
      clientY 
    }));
    
    // Dispatch drop on target
    toEl.dispatchEvent(new DragEvent('drop', { 
      bubbles: true, 
      cancelable: true, 
      dataTransfer: dt,
      clientY 
    }));
    
    // Dispatch dragend on source
    fromEl.dispatchEvent(new DragEvent('dragend', { 
      bubbles: true, 
      cancelable: true, 
      dataTransfer: dt 
    }));
  }, { fromTitle, toTitle, position });
  
  await page.waitForTimeout(300);
}

test('drag D before C', async () => {
  // Initial order: A, B, C, D, E
  expect(await getTaskTitles(page)).toEqual(['A', 'B', 'C', 'D', 'E']);
  
  // Drag D before C -> A, B, D, C, E
  await dragTask(page, 'D', 'C', 'before');
  
  expect(await getTaskTitles(page)).toEqual(['A', 'B', 'D', 'C', 'E']);
});

test('drag A after D', async () => {
  // Current order: A, B, D, C, E
  // Drag A after D -> B, D, A, C, E
  await dragTask(page, 'A', 'D', 'after');
  
  expect(await getTaskTitles(page)).toEqual(['B', 'D', 'A', 'C', 'E']);
});

test('drag E before B', async () => {
  // Current order: B, D, A, C, E
  // Drag E before B -> E, B, D, A, C
  await dragTask(page, 'E', 'B', 'before');
  
  expect(await getTaskTitles(page)).toEqual(['E', 'B', 'D', 'A', 'C']);
});

test('drag with nested tasks - D before C', async () => {
  // Create a new list with nested structure
  await createList(page, 'Nested Test');
  await createTask(page, 'Parent');
  
  // Indent to create child (need to select Parent first, create Child, then indent)
  await createTask(page, 'Child');
  await press(page, 'Tab'); // Indent Child under Parent
  await page.waitForTimeout(100);
  
  // Create more root tasks
  await createTask(page, 'C');
  await createTask(page, 'D');
  await createTask(page, 'E');
  
  // Order should be: Parent (with Child nested), C, D, E
  const titles = await getTaskTitles(page);
  expect(titles).toContain('Parent');
  expect(titles).toContain('Child');
  expect(titles).toContain('C');
  expect(titles).toContain('D');
  
  // Now drag D before C
  await dragTask(page, 'D', 'C', 'before');
  await page.waitForTimeout(200);
  
  // Get new order - D should now be before C
  const newTitles = await getTaskTitles(page);
  const dIndex = newTitles.indexOf('D');
  const cIndex = newTitles.indexOf('C');
  
  expect(dIndex).toBeLessThan(cIndex);
});
