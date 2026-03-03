import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, Recorder } from './helpers';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

async function getListNames(page: Page): Promise<string[]> {
  const items = await page.locator('.lists-pane .item:not(.smart-list)').all();
  const names: string[] = [];
  for (const item of items) {
    const text = await item.textContent();
    if (text && text.trim() !== 'Trash') names.push(text.trim());
  }
  return names;
}

async function createList(page: Page, name: string): Promise<void> {
  await press(page, 'n', { meta: true, shift: true });
  await page.waitForSelector('.lists-pane input');
  await page.locator('.lists-pane input').fill(name);
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(100);
}

async function createFolder(page: Page, name: string): Promise<void> {
  // Open command palette and create folder
  await press(page, 'k', { meta: true });
  await page.waitForSelector('.command-palette');
  await page.locator('.command-palette input').fill('new folder');
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.lists-pane input');
  await page.locator('.lists-pane input').fill(name);
  await page.locator('.lists-pane input').press('Enter');
  await page.waitForTimeout(100);
}

test.beforeAll(async () => {
  ({ app, page, dbPath, recorder } = await launchApp('test-list-reorder.db'));
  
  // Create folder with a list inside
  await createFolder(page, 'TestFolder');
  // Folder is now selected, create list (will be inside folder)
  await createList(page, 'ListInFolder');
  
  // Navigate to Tutorial (default list, should be below folder)
  // and create TopLevelList below it
  await press(page, 'ArrowDown'); // to Tutorial
  await press(page, 'ArrowDown'); // past Tutorial
  await createList(page, 'TopLevelList');
  
  // Navigate back to Tutorial for the test
  await press(page, 'ArrowUp'); // back to Tutorial
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder);
});

test('Opt+Up moves list into folder above', async () => {
  const before = await getListNames(page);
  console.log('Before:', before);
  
  // Check what's selected
  const selectedBefore = await page.locator('.lists-pane .item.selected .item-name').textContent();
  console.log('Selected before:', selectedBefore);
  
  // Tutorial should be selected, move it up into folder
  await press(page, 'ArrowUp', { alt: true });
  await page.waitForTimeout(200);
  
  const after = await getListNames(page);
  console.log('After Opt+Up:', after);
  
  // Tutorial should now be inside folder (above ListInFolder)
  const folderIdx = after.indexOf('TestFolder');
  const listInFolderIdx = after.indexOf('ListInFolder');
  const tutorialIdx = after.indexOf('Tutorial');
  console.log('Folder idx:', folderIdx, 'ListInFolder idx:', listInFolderIdx, 'Tutorial idx:', tutorialIdx);
  // Tutorial should be right after folder (above ListInFolder)
  expect(tutorialIdx).toBe(folderIdx + 1);
  expect(listInFolderIdx).toBe(tutorialIdx + 1);
  
  // Cursor should still be on Tutorial
  const selected = await page.locator('.lists-pane .item.selected .item-name').textContent();
  console.log('Selected after move:', selected);
  expect(selected).toBe('Tutorial');
});

test('Opt+Down moves list out of folder when at end', async () => {
  // TopLevelList is now last in folder
  // Move down - should move out of folder
  const before = await getListNames(page);
  console.log('Before moving out:', before);
  
  await press(page, 'ArrowDown', { alt: true });
  await page.waitForTimeout(200);
  
  const after = await getListNames(page);
  console.log('After Opt+Down:', after);
  
  // TopLevelList should now be top-level (after all folder contents)
  const folderIdx = after.indexOf('TestFolder');
  const listInFolderIdx = after.indexOf('ListInFolder');
  const topLevelIdx = after.indexOf('TopLevelList');
  // TopLevelList should be after ListInFolder (which is still in folder)
  expect(topLevelIdx).toBeGreaterThan(listInFolderIdx);
});

test('Opt+Up moves top-level list into folder when above list is in folder', async () => {
  // TopLevelList is now top-level, move it back up into folder
  await press(page, 'ArrowUp', { alt: true });
  await page.waitForTimeout(200);
  
  const after = await getListNames(page);
  console.log('After moving top-level list up into folder:', after);
  
  // TopLevelList should now be inside folder (after ListInFolder)
  const folderIdx = after.indexOf('TestFolder');
  const listInFolderIdx = after.indexOf('ListInFolder');
  const topLevelIdx = after.indexOf('TopLevelList');
  
  // Both should be inside folder (after folder index)
  expect(listInFolderIdx).toBeGreaterThan(folderIdx);
  expect(topLevelIdx).toBeGreaterThan(folderIdx);
});
