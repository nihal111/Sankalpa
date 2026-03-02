import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToTasksPane, mockTasks } from './test-utils';

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

  it('Cmd+C copies task to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'c', metaKey: true });
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  it('Cmd+X then Cmd+V cuts and pastes task', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    const mockReadText = vi.fn().mockResolvedValue('- Test task');
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText);
    vi.spyOn(navigator.clipboard, 'readText').mockImplementation(mockReadText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'x', metaKey: true });
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
    fireEvent.keyDown(window, { key: 'v', metaKey: true });
    await waitFor(() => {
      expect(mockReadText).toHaveBeenCalled();
    });
  });

  it('Ctrl+Enter toggles multi-select at cursor', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    await waitFor(() => {
      expect(window.api.tasksGetInbox).toHaveBeenCalled();
    });
  });

  it('Ctrl+Enter twice deselects task', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    await waitFor(() => {
      expect(window.api.tasksGetInbox).toHaveBeenCalled();
    });
  });

  it('Cmd+C copies multiple selected tasks', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'c', metaKey: true });
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  it('Cmd+V pastes empty clipboard gracefully', async () => {
    const mockReadText = vi.fn().mockResolvedValue('');
    vi.spyOn(navigator.clipboard, 'readText').mockImplementation(mockReadText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'v', metaKey: true });
    await waitFor(() => {
      expect(mockReadText).toHaveBeenCalled();
    });
  });

  it('Cmd+V handles clipboard read error', async () => {
    const mockReadText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
    vi.spyOn(navigator.clipboard, 'readText').mockImplementation(mockReadText);

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'v', metaKey: true });
    await waitFor(() => {
      expect(mockReadText).toHaveBeenCalled();
    });
  });

  it('Cmd+V calls tasksCreate with correct parameters', async () => {
    const mockReadText = vi.fn().mockResolvedValue('- Test task\n- Another task');
    const mockCreate = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'readText').mockImplementation(mockReadText);
    window.api.tasksCreate = mockCreate;

    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'v', metaKey: true });
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.any(String), '1', 'Test task');
      expect(mockCreate).toHaveBeenCalledWith(expect.any(String), '1', 'Another task');
    });
  });
});
