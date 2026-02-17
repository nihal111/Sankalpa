import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList, navigateToTasksPane, mockTasks } from './test-utils';

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

  it('does not create task on non-inbox smart list', async () => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([]),
      foldersGetAll: vi.fn().mockResolvedValue([]),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    // Navigate to Overdue (second smart list)
    fireEvent.keyDown(window, { key: 'ArrowDown' });
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

  it('quick-add creates task in inbox (list_id = null)', async () => {
    let quickAddCallback: (() => void) | null = null;
    setupMockApi({
      onQuickAdd: vi.fn().mockImplementation((cb: () => void) => {
        quickAddCallback = cb;
        return () => {};
      }),
      tasksCreate: vi.fn().mockResolvedValue({ id: 'new', list_id: null, title: '', sort_key: 1, created_at: 0, updated_at: 0 }),
      tasksGetInbox: vi.fn().mockResolvedValue([{ id: 'new', list_id: null, title: '', sort_key: 1, created_at: 0, updated_at: 0 }]),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(quickAddCallback).not.toBeNull();
    quickAddCallback!();
    await waitFor(() => {
      expect(window.api.tasksCreate).toHaveBeenCalledWith(expect.any(String), null, '');
    });
  });

  it('Cmd+N creates task in inbox when smart Inbox selected', async () => {
    setupMockApi({
      tasksCreate: vi.fn().mockResolvedValue({ id: 'new', list_id: null, title: '', sort_key: 1, created_at: 0, updated_at: 0 }),
      tasksGetInbox: vi.fn().mockResolvedValue([{ id: 'new', list_id: null, title: '', sort_key: 1, created_at: 0, updated_at: 0 }]),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    // Smart Inbox is selected by default (index 0)
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => {
      expect(window.api.tasksCreate).toHaveBeenCalledWith(expect.any(String), null, '');
    });
  });
});
