# 8. End-to-End Testing with Playwright

Date: 2026-02-17

## Status

Accepted

## Context

Unit tests with mocked APIs don't catch timing-related bugs that occur with real user interaction. We discovered a bug where Cmd+N from the tasks pane didn't move selection to the new task. The unit test passed because it dispatched a single synthetic `keydown` event, but real keyboard input involves:

1. Modifier key down (Meta)
2. Letter key down while modifier held
3. Letter key up
4. Modifier key up

The bug was caused by `handleCmdUp` restoring the selection to the pre-Cmd position, overwriting the new task's index.

## Decision

Use Playwright for Electron e2e tests that simulate real user interaction.

### Setup

```typescript
// e2e/helpers.ts
import { _electron as electron } from '@playwright/test';

export async function launchApp(testDbName: string) {
  const headless = process.env.HEADLESS === '1';
  const app = await electron.launch({
    args: headless ? ['.', '--test-headless'] : ['.'],
    env: { ...process.env, SANKALPA_DB_PATH: dbPath },
  });
  const page = await app.firstWindow();
  return { app, page, dbPath };
}
```

### Headless Mode

Electron doesn't support true headless mode like browsers. The workaround is to hide the window:

```typescript
// src/main/index.ts
const isTestHeadless = process.argv.includes('--test-headless');

mainWindow = new BrowserWindow({
  show: !isTestHeadless, // Don't show window in headless test mode
  // ...
});
```

On Linux CI, also use `xvfb-run` for a virtual display.

### Keyboard Simulation

Playwright's `page.keyboard.press()` doesn't trigger `window` event listeners in Electron reliably. Use `dispatchEvent` with realistic key sequences:

```typescript
async function press(page: Page, key: string, opts: { meta?: boolean } = {}): Promise<void> {
  if (opts.meta) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true, bubbles: true }));
    });
  }
  await page.evaluate(({ key, meta }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: meta, bubbles: true }));
  }, { key, meta: opts.meta });
  await page.evaluate(({ key, meta }) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key, metaKey: meta, bubbles: true }));
  }, { key, meta: opts.meta });
  if (opts.meta) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', metaKey: false, bubbles: true }));
    });
  }
}
```

### Database Isolation

Use `SANKALPA_DB_PATH` env var to isolate test data from dev database:

```typescript
// src/main/db/connection.ts
function getDbPath(): string {
  if (process.env.SANKALPA_DB_PATH) return process.env.SANKALPA_DB_PATH;
  return path.join(app.getPath('userData'), 'sankalpa.db');
}
```

### Scripts

- `npm run test:e2e` - Build and run with visible window
- `npm run test:e2e:headless` - Build and run headless (no window)
- `npm run test:e2e:dev` - Run against dev server (start `npm run dev` first)

## Consequences

- Can catch timing bugs that unit tests miss
- Tests are slower (~2s per test vs ~20ms for unit tests)
- Requires building the app before running
- Headless mode hides window but still requires display (use xvfb on Linux CI)
