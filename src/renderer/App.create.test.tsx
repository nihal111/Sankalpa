import { render, waitFor, fireEvent } from '@testing-library/react';
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

  it('reorders task with Opt+Down', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    await waitFor(() => {
      expect(window.api.tasksReorder).toHaveBeenCalled();
    });
  });

  it('does not reorder at boundary', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
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
    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    await waitFor(() => {
      taskItems = document.querySelectorAll('.tasks-pane .item');
      expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
    });
  });

  it('quick-add opens quick add modal', async () => {
    let quickAddCallback: (() => void) | null = null;
    setupMockApi({
      onQuickAdd: vi.fn().mockImplementation((cb: () => void) => {
        quickAddCallback = cb;
        return () => {};
      }),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(quickAddCallback).not.toBeNull();
    quickAddCallback!();
    await waitFor(() => {
      expect(document.querySelector('.quick-add-modal')).not.toBeNull();
    });
  });

  it('Cmd+N from tasks pane moves selection to new task', async () => {
    const newTask = { id: 'new', list_id: '1', title: '', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, sort_key: 3, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks) // initial load
      .mockResolvedValueOnce([...mockTasks, newTask]); // after create
    setupMockApi({
      tasksCreate: vi.fn().mockResolvedValue(newTask),
      tasksGetByList,
    });
    render(<App />);
    await navigateToTasksPane();
    // Move selection to second task (index 1)
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[1]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => {
      taskItems = document.querySelectorAll('.tasks-pane .item');
      expect(taskItems.length).toBe(3); // wait for refetch
    });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    // New task is at index 2 (last), should be selected
    expect(taskItems[2]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+N creates task in inbox when smart Inbox selected', async () => {
    setupMockApi({
      tasksCreate: vi.fn().mockResolvedValue({ id: 'new', list_id: null, title: '', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 }),
      tasksGetInbox: vi.fn().mockResolvedValue([{ id: 'new', list_id: null, title: '', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 }]),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    // Smart Inbox is selected by default (index 0)
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => {
      expect(window.api.tasksCreate).toHaveBeenCalledWith(expect.any(String), null, '');
    });
  });

  it('Cmd+Opt+N creates a sibling task below at same nesting level', async () => {
    let createdId: string | null = null;
    const nestedTasks = [
      { id: 'p1', list_id: '1', title: 'Parent', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, duration: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
      { id: 'c1', list_id: '1', title: 'Child 1', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, duration: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: 'p1', is_expanded: 1 },
      { id: 'c2', list_id: '1', title: 'Child 2', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, duration: null, sort_key: 4, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: 'p1', is_expanded: 1 },
    ];
    setupMockApi({
      tasksGetByList: vi.fn().mockImplementation(async () => {
        if (!createdId) return nestedTasks;
        return [...nestedTasks, { id: createdId, list_id: '1', title: '', status: 'PENDING', created_timestamp: 1, completed_timestamp: null, due_date: null, duration: null, sort_key: 2.5, created_at: 1, updated_at: 1, deleted_at: null, notes: null, parent_id: 'p1', is_expanded: 1 }];
      }),
      tasksCreate: vi.fn().mockImplementation(async (id: string, listId: string | null, title: string) => {
        createdId = id;
        return { id, list_id: listId, title, status: 'PENDING', created_timestamp: 1, completed_timestamp: null, due_date: null, duration: null, sort_key: 99, created_at: 1, updated_at: 1, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
      }),
      calcSortKey: vi.fn().mockResolvedValue(2.5),
    });
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // select Child 1
    fireEvent.keyDown(window, { key: 'n', metaKey: true, altKey: true, code: 'KeyN' });
    await waitFor(() => expect(window.api.tasksCreate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.api.tasksSetParentId).toHaveBeenCalledWith(createdId, 'p1'));
    await waitFor(() => expect(window.api.calcSortKey).toHaveBeenCalledWith(2, 4));
    await waitFor(() => expect(window.api.tasksReorder).toHaveBeenCalledWith(createdId, 2.5));
  });

  it('committing empty new task evaporates it', async () => {
    const newTask = { id: 'new', list_id: '1', title: '', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, sort_key: 3, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    setupMockApi({
      tasksCreate: vi.fn().mockResolvedValue(newTask),
      tasksGetByList: vi.fn().mockResolvedValue([...mockTasks, newTask]),
    });
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => expect(document.querySelector('.task-content input')).not.toBeNull());
    const input = document.querySelector('.task-content input') as HTMLInputElement;
    // Leave empty and commit
    fireEvent.keyDown(input, { key: 'Enter' });
    // The evaporate uses setTimeout(200ms), wait for it
    await new Promise((r) => setTimeout(r, 300));
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('new'));
  });
});
