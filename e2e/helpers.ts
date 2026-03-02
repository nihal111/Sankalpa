import { Page, ElectronApplication } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export type Recorder = { timer: ReturnType<typeof setInterval>; frames: Buffer[] } | null;

const RECORDING_DIR = path.join(__dirname, '..', 'test-recordings');
const FRAME_INTERVAL_MS = 200;
const GIF_SLOWDOWN = 1;

export async function launchApp(testDbName: string): Promise<{ app: ElectronApplication; page: Page; dbPath: string; recorder: Recorder }> {
  const { _electron: electron } = await import('@playwright/test');
  const dbPath = path.join(__dirname, testDbName);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  
  const isDev = process.env.SANKALPA_DEV === '1';
  const headless = process.env.HEADLESS === '1';
  
  const launchArgs = headless ? ['.', '--test-headless'] : ['.'];
  if (process.env.RECORD === '1') {
    launchArgs.push('--force-device-scale-factor=1');
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    launchArgs.push('--no-sandbox');
  }

  const app = await electron.launch({
    args: launchArgs,
    env: {
      ...process.env,
      SANKALPA_DB_PATH: dbPath,
      NODE_ENV: isDev ? 'development' : 'production',
    },
  });
  
  const page = await app.firstWindow();
  await page.waitForSelector('.lists-pane', { timeout: 2000 });

  let recorder: Recorder = null;
  if (process.env.RECORD === '1') {
    if (!fs.existsSync(RECORDING_DIR)) fs.mkdirSync(RECORDING_DIR, { recursive: true });
    // Resize window for smaller GIFs
    const win = await app.browserWindow(page);
    await win.evaluate((w) => w.setSize(1200, 675));
    // Set dark mode for GIF recordings
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await injectKeystrokeOverlay(page);
    const frames: Buffer[] = [];
    const timer = setInterval(async () => {
      try { frames.push(await page.screenshot()); } catch {}
    }, FRAME_INTERVAL_MS);
    recorder = { timer, frames };
  }

  return { app, page, dbPath, recorder };
}

export async function closeApp(app: ElectronApplication, dbPath: string, recorder: Recorder): Promise<void> {
  if (recorder) {
    clearInterval(recorder.timer);
    // Capture one final frame
    try {
      const page = app.windows()[0];
      if (page) recorder.frames.push(await page.screenshot());
    } catch {}
    if (recorder.frames.length > 0) {
      const specName = dbPath.replace(/.*\/test-/, '').replace('.db', '');
      await encodeGif(recorder.frames, path.join(RECORDING_DIR, `${specName}.gif`));
    }
  }
  await app.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

async function encodeGif(pngBuffers: Buffer[], outPath: string): Promise<void> {
  const gifenc = await import('gifenc');
  const { GIFEncoder, quantize, applyPalette } = ('default' in gifenc ? gifenc.default as typeof gifenc : gifenc);
  const { PNG } = await import('pngjs');

  const gif = GIFEncoder();
  let prevBuf: Buffer | null = null;

  for (const buf of pngBuffers) {
    // Skip duplicate frames
    if (prevBuf && buf.equals(prevBuf)) continue;
    prevBuf = buf;
    
    const { data, width, height } = PNG.sync.read(buf);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: FRAME_INTERVAL_MS * GIF_SLOWDOWN });
  }

  gif.finish();
  fs.writeFileSync(outPath, gif.bytes());
}

const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Enter: '⏎', Escape: 'Esc', Tab: '⇥', ' ': 'Space',
  Backspace: '⌫', Delete: '⌫',
};

function formatKeystroke(key: string, opts: { meta?: boolean; shift?: boolean; ctrl?: boolean; alt?: boolean }): string {
  const parts: string[] = [];
  if (opts.ctrl) parts.push('⌃');
  if (opts.alt) parts.push('⌥');
  if (opts.meta) parts.push('⌘');
  if (opts.shift) parts.push('⇧');
  parts.push(KEY_LABELS[key] ?? key.toUpperCase());
  return parts.join(' + ');
}

async function injectKeystrokeOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'keystroke-overlay';
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: '99999',
      background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '18px 42px',
      borderRadius: '12px', fontSize: '54px', fontFamily: 'system-ui, sans-serif',
      fontWeight: '600', opacity: '0', transition: 'opacity 0.15s',
      pointerEvents: 'none',
    });
    document.body.appendChild(el);
  });
}

export async function showOverlay(page: Page, label: string): Promise<void> {
  if (process.env.RECORD !== '1') return;
  await page.evaluate((text) => {
    const el = document.getElementById('keystroke-overlay');
    if (el) { el.textContent = text; el.style.opacity = '1'; }
  }, label);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const el = document.getElementById('keystroke-overlay');
    if (el) el.style.opacity = '0';
  });
}

export async function press(page: Page, key: string, opts: { meta?: boolean; shift?: boolean; ctrl?: boolean; alt?: boolean } = {}): Promise<void> {
  if (process.env.RECORD === '1') {
    const label = formatKeystroke(key, opts);
    await page.evaluate((text) => {
      const el = document.getElementById('keystroke-overlay');
      if (el) { el.textContent = text; el.style.opacity = '1'; }
    }, label);
  }

  if (opts.ctrl) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true, bubbles: true }));
    });
    await page.waitForTimeout(20);
  }
  if (opts.alt) {
    await page.evaluate(({ ctrl }) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, ctrlKey: ctrl, bubbles: true }));
    }, { ctrl: opts.ctrl });
    await page.waitForTimeout(20);
  }
  if (opts.meta) {
    await page.evaluate(({ ctrl, alt }) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true, ctrlKey: ctrl, altKey: alt, bubbles: true }));
    }, { ctrl: opts.ctrl, alt: opts.alt });
    await page.waitForTimeout(20);
  }
  if (opts.shift) {
    await page.evaluate(({ meta, ctrl, alt }) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, metaKey: meta, ctrlKey: ctrl, altKey: alt, bubbles: true }));
    }, { meta: opts.meta, ctrl: opts.ctrl, alt: opts.alt });
    await page.waitForTimeout(20);
  }
  
  await page.evaluate(({ key, meta, shift, ctrl, alt }) => {
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, metaKey: meta, shiftKey: shift, ctrlKey: ctrl, altKey: alt, bubbles: true }));
  }, { key, meta: opts.meta, shift: opts.shift, ctrl: opts.ctrl, alt: opts.alt });
  await page.waitForTimeout(20);
  
  await page.evaluate(({ key, meta, shift, ctrl, alt }) => {
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    window.dispatchEvent(new KeyboardEvent('keyup', { key, code, metaKey: meta, shiftKey: shift, ctrlKey: ctrl, altKey: alt, bubbles: true }));
  }, { key, meta: opts.meta, shift: opts.shift, ctrl: opts.ctrl, alt: opts.alt });
  await page.waitForTimeout(20);
  
  if (opts.shift) {
    await page.evaluate(({ meta, ctrl, alt }) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', shiftKey: false, metaKey: meta, ctrlKey: ctrl, altKey: alt, bubbles: true }));
    }, { meta: opts.meta, ctrl: opts.ctrl, alt: opts.alt });
    await page.waitForTimeout(20);
  }
  if (opts.meta) {
    await page.evaluate(({ ctrl, alt }) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', metaKey: false, ctrlKey: ctrl, altKey: alt, bubbles: true }));
    }, { ctrl: opts.ctrl, alt: opts.alt });
    await page.waitForTimeout(20);
  }
  if (opts.alt) {
    await page.evaluate(({ ctrl }) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', altKey: false, ctrlKey: ctrl, bubbles: true }));
    }, { ctrl: opts.ctrl });
    await page.waitForTimeout(20);
  }
  if (opts.ctrl) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: false, bubbles: true }));
    });
    await page.waitForTimeout(20);
  }

  if (process.env.RECORD === '1') {
    await page.waitForTimeout(400); // Keep overlay visible longer
    await page.evaluate(() => {
      const el = document.getElementById('keystroke-overlay');
      if (el) el.style.opacity = '0';
    });
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
  await page.waitForSelector('.tasks-pane .edit-input');
  await page.locator('.tasks-pane .edit-input').fill(title);
  await page.locator('.tasks-pane .edit-input').press('Enter');
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
