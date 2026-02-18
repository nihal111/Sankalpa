import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 10000,
  retries: 0,
  workers: 1, // Run sequentially - each test file launches its own Electron app
  use: {
    trace: 'on-first-retry',
  },
});
