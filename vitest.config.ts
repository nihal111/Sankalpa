import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    pool: 'vmThreads',
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main/db/migrations.ts',
        'src/main/db/connection.ts',
        'src/main/index.ts',
        'src/renderer/main.tsx',
        '**/*.test.{ts,tsx}',
        '**/test-utils.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
