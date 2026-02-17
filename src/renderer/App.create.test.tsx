import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList, navigateToTasksPane } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App create and reorder', () => {
  it('creates new task with Cmd+N', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => {
      expect(window.api.tasksCreate).toHaveBeenCalled();
    });
    await waitFor(() => {
      const input = document.querySelector('.tasks-pane input');
      expect(input).toBeDefined();
    });
  });

  it('creates new list with Cmd+Shift+N', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true });
    await waitFor(() => {
      expect(window.api.listsCreate).toHaveBeenCalled();
    });
    await waitFor(() => {
      const input = document.querySelector('.lists-pane input');
      expect(input).toBeDefined();
    });
  });

  it('does not create task without selected list', async () => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([]),
      foldersGetAll: vi.fn().mockResolvedValue([]),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(window.api.tasksCreate).not.toHaveBeenCalled();
  });

  it('reorders task with Cmd+Shift+Down', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });
    await waitFor(() => {
      expect(window.api.tasksReorder).toHaveBeenCalled();
    });
  });

  it('does not reorder at boundary', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true, shiftKey: true });
    expect(window.api.tasksReorder).not.toHaveBeenCalled();
  });

  it('reorder clears any existing selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });
    await waitFor(() => {
      taskItems = document.querySelectorAll('.tasks-pane .item');
      expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
    });
  });
});
