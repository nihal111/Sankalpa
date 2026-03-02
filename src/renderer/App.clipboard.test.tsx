import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToTasksPane } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App clipboard', () => {
  it('Cmd+X cuts task to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'x', metaKey: true });
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  it('Cmd+V pastes task from clipboard', async () => {
    const mockReadText = vi.fn().mockResolvedValue('- Pasted task');
    vi.spyOn(navigator.clipboard, 'readText').mockImplementation(mockReadText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'v', metaKey: true });
    await waitFor(() => {
      expect(mockReadText).toHaveBeenCalled();
    });
  });
});
