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
      exclude: [
        'src/main/db/migrations.ts',
        'src/main/db/connection.ts',
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
