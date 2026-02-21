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
        'src/renderer/hooks/useTaskNesting.ts',
        'src/renderer/utils/taskTree.ts',
        '**/*.test.{ts,tsx}',
        '**/test-utils.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 90,
        branches: 90,
        statements: 95,
      },
    },
  },
});
