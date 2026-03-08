import { test, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, press, createTask, Recorder, showOverlay } from './helpers';
import fs from 'fs';
import path from 'path';

const envPath = path.join(__dirname, '..', '.env.cloud-sync');
const envVars = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs.readFileSync(envPath, 'utf-8')
        .split('\n')
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split('=').map(s => s.trim()))
    )
  : {};

const SUPABASE_URL = envVars['SUPABASE_URL'] || '';
const SERVICE_ROLE_KEY = envVars['SERVICE_ROLE_KEY'] || '';

let app: ElectronApplication;
let page: Page;
let dbPath: string;
let recorder: Recorder;

test.beforeAll(async () => {
  test.skip(!SUPABASE_URL || !SERVICE_ROLE_KEY, 'Missing .env.cloud-sync credentials');
  ({ app, page, dbPath, recorder } = await launchApp('test-gif-cloud-restore.db'));
});

test.afterAll(async () => {
  await closeApp(app, dbPath, recorder, 'gif-cloud-restore');
});

test('cloud restore from Supabase', async () => {
  test.setTimeout(60_000);

  // --- Create some tasks so there's data to sync ---
  await press(page, 'ArrowRight');
  await page.waitForTimeout(200);
  await createTask(page, 'Design homepage');
  await createTask(page, 'Write API docs');
  await createTask(page, 'Fix login bug');
  await page.waitForTimeout(400);

  // --- Open Settings → Cloud Sync ---
  await press(page, ',', { meta: true });
  await page.waitForTimeout(400);

  // Navigate down to Cloud Sync category (Theme → Hardcore → Trash → Cloud Sync)
  await press(page, 'ArrowDown');
  await page.waitForTimeout(200);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(200);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(400);

  // --- Enter credentials ---
  await page.locator('.cloud-input').first().fill(SUPABASE_URL);
  await page.waitForTimeout(300);

  await press(page, 'Tab');
  await page.waitForTimeout(200);
  await page.locator('.cloud-input').nth(1).fill(SERVICE_ROLE_KEY);
  await page.waitForTimeout(300);

  // Tab to Save & Connect and press Enter
  await press(page, 'Tab');
  await page.waitForTimeout(200);
  await showOverlay(page, '⏎  Save & Connect');
  await press(page, 'Enter');

  // Wait for connection
  await page.waitForSelector('.cloud-dot', { timeout: 10_000 });
  await page.waitForTimeout(800);

  // --- Sync to Cloud ---
  await showOverlay(page, '⏎  Sync to Cloud');
  await press(page, 'Enter');
  await page.waitForSelector('.cloud-message.success', { timeout: 15_000 });
  await page.waitForTimeout(1000);

  // --- Close settings, add a local-only task ---
  await press(page, 'Escape');
  await page.waitForTimeout(300);
  await createTask(page, 'This task is only local');
  await page.waitForTimeout(500);

  // --- Re-open Settings → Cloud Sync ---
  await press(page, ',', { meta: true });
  await page.waitForTimeout(400);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(150);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(150);
  await press(page, 'ArrowDown');
  await page.waitForTimeout(400);

  // --- Navigate to Restore from Cloud ---
  await press(page, 'ArrowDown'); // sync → restore
  await page.waitForTimeout(300);
  await showOverlay(page, '⏎  Restore from Cloud');
  await press(page, 'Enter');

  // Wait for backups list
  await page.waitForSelector('.cloud-backups', { timeout: 10_000 });
  await page.waitForTimeout(800);

  // --- Browse backups ---
  await press(page, 'ArrowDown'); // move to first backup snapshot
  await page.waitForTimeout(400);
  await press(page, 'ArrowUp'); // back to Restore Latest
  await page.waitForTimeout(400);

  // --- Confirm restore ---
  await showOverlay(page, '⏎  Restore Latest');
  await press(page, 'Enter');
  await page.waitForTimeout(500);

  // Confirmation prompt
  await page.waitForSelector('.cloud-confirm');
  await page.waitForTimeout(600);

  await showOverlay(page, '⏎  Confirm');
  await press(page, 'Enter');

  // Wait for restore to complete
  await page.waitForSelector('.cloud-message.success', { timeout: 15_000 });
  await page.waitForTimeout(1200);

  // Close settings to show restored task list
  await press(page, 'Escape');
  await page.waitForTimeout(800);
});
