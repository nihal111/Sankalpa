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
        'src/main/db/index.ts',
        'src/main/index.ts',
        'src/renderer/main.tsx',
        // Hooks with heavy window.api dependencies - tested via App.*.test.tsx integration tests
        'src/renderer/hooks/useTaskNesting.ts',
        'src/renderer/hooks/usePaletteState.ts',
        'src/renderer/hooks/useMoveListState.ts',
        'src/renderer/hooks/useDragDrop.ts',
        'src/renderer/hooks/useContextMenu.ts',
        'src/renderer/hooks/useMetaKey.ts',
        'src/renderer/hooks/useDurationState.ts',
        'src/renderer/hooks/useNotesState.ts',
        // UI components - tested via App.*.test.tsx integration tests
        'src/renderer/CommandPalette.tsx',
        'src/renderer/ListInfoModal.tsx',
        'src/renderer/ConfirmationDialog.tsx',
        'src/renderer/MoveListOverlay.tsx',
        'src/renderer/DurationModal.tsx',
        'src/renderer/DueDateModal.tsx',
        'src/shared/types.ts',
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
