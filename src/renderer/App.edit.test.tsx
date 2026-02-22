import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList, navigateToTasksPane } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App edit mode', () => {
  it('enters edit mode on Enter for list', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => {
      const input = document.querySelector('.lists-pane input');
      expect(input).toBeDefined();
    });
  });

  it('enters edit mode on Enter for task', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => {
      const input = document.querySelector('.tasks-pane .edit-input');
      expect(input).toBeDefined();
    });
  });

  it('cancels edit mode on Escape', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.lists-pane input')).toBeNull();
  });

  it('commits list edit on Enter', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    const input = document.querySelector('.lists-pane input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.listsUpdate).toHaveBeenCalledWith('1', 'New Name'));
  });

  it('commits task edit on Enter', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeDefined());
    const input = document.querySelector('.tasks-pane .edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Task' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'New Task'));
  });

  it('cancels edit on blur', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    const input = document.querySelector('.lists-pane input') as HTMLInputElement;
    fireEvent.blur(input);
    expect(document.querySelector('.lists-pane input')).toBeNull();
  });

  it('does not commit empty edit', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    const input = document.querySelector('.lists-pane input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(window.api.listsUpdate).not.toHaveBeenCalled();
  });

  it('does not enter edit mode when no item selected', async () => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([]),
      foldersGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue([]),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'e' });
    expect(document.querySelector('input')).toBeNull();
  });

  it('task edit input loses focus on blur', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeDefined());
    const input = document.querySelector('.tasks-pane .edit-input') as HTMLInputElement;
    fireEvent.blur(input);
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeNull());
  });

  it('does not enter edit mode on smart list', async () => {
    render(<App />);
    await navigateToUserList();
    for (let i = 0; i < 6; i++) {
      fireEvent.keyDown(window, { key: 'ArrowUp' });
    }
    fireEvent.keyDown(window, { key: 'e' });
    expect(document.querySelector('.lists-pane input')).toBeNull();
  });

  it('Enter does nothing when multi-selection exists', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'e' });
    expect(document.querySelector('.tasks-pane .edit-input')).toBeNull();
  });

  it('deletes task on Delete key', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('t1'));
  });

  it('deletes task on Backspace key', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Backspace' });
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('t1'));
  });

  it('Delete does nothing when no tasks', async () => {
    const emptyTasksMock = vi.fn().mockResolvedValue([]);
    window.api.tasksGetByList = emptyTasksMock;
    render(<App />);
    await waitFor(() => expect(document.querySelectorAll('.lists-pane .item.list').length).toBeGreaterThan(0));
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(window.api.tasksDelete).not.toHaveBeenCalled();
  });

  it('Cmd+Enter does nothing when no tasks', async () => {
    const emptyTasksMock = vi.fn().mockResolvedValue([]);
    window.api.tasksGetByList = emptyTasksMock;
    render(<App />);
    await waitFor(() => expect(document.querySelectorAll('.lists-pane .item.list').length).toBeGreaterThan(0));
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(window.api.tasksToggleCompleted).not.toHaveBeenCalled();
  });

  it('deletes task from inbox and reloads', async () => {
    const inboxTasks = [
      { id: 'inbox-t1', list_id: null, title: 'Inbox Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({
      tasksGetInbox: vi.fn().mockResolvedValue(inboxTasks),
      tasksDelete: vi.fn().mockResolvedValue(undefined),
    });
    render(<App />);
    // Smart Inbox is selected by default
    await waitFor(() => expect(screen.getByText('Inbox Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('inbox-t1'));
    expect(window.api.tasksGetInbox).toHaveBeenCalled();
  });

  it('Delete on user list calls listsDelete', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.listsDelete).toHaveBeenCalled());
  });

  it('Delete on smart list does nothing', async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelectorAll('.lists-pane .item').length).toBeGreaterThan(0));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(window.api.listsDelete).not.toHaveBeenCalled();
  });

  it('D key opens due date modal and Enter commits it', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'd' });
    await waitFor(() => expect(document.querySelector('.due-date-modal-input')).not.toBeNull());
    const input = document.querySelector('.due-date-modal-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tomorrow' } });
    await waitFor(() => expect(document.querySelector('.due-date-suggestion-item')).not.toBeNull());
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksSetDueDate).toHaveBeenCalled());
  });

  it('D key on task with existing due date shows current value in modal', async () => {
    const taskWithDue = { id: 't1', list_id: '1', title: 'Task 1', status: 'PENDING' as const, created_timestamp: 0, completed_timestamp: null, due_date: new Date('2026-06-15T09:00').getTime(), sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    setupMockApi({ tasksGetByList: () => Promise.resolve([taskWithDue]) });
    render(<App />);
    await navigateToTasksPane();
    await waitFor(() => expect(document.querySelector('.task-due-date')).not.toBeNull());
    fireEvent.keyDown(window, { key: 'd' });
    await waitFor(() => expect(document.querySelector('.due-date-current')).not.toBeNull());
  });

  it('Escape cancels due date modal', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'd' });
    await waitFor(() => expect(document.querySelector('.due-date-modal-input')).not.toBeNull());
    const input = document.querySelector('.due-date-modal-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.due-date-modal-input')).toBeNull());
    expect(window.api.tasksSetDueDate).not.toHaveBeenCalled();
  });

  it('overdue task shows red due date', async () => {
    const pastDate = Date.now() - 86400000;
    const overdueTask = { id: 't1', list_id: '1', title: 'Task 1', status: 'PENDING' as const, created_timestamp: 0, completed_timestamp: null, due_date: pastDate, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    setupMockApi({ tasksGetByList: () => Promise.resolve([overdueTask]) });
    render(<App />);
    await navigateToTasksPane();
    await waitFor(() => expect(document.querySelector('.task-due-date.overdue')).not.toBeNull());
  });

  it('D key with empty Enter clears due date', async () => {
    const taskWithDue = { id: 't1', list_id: '1', title: 'Task 1', status: 'PENDING' as const, created_timestamp: 0, completed_timestamp: null, due_date: 1000, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    setupMockApi({ tasksGetByList: () => Promise.resolve([taskWithDue]) });
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'd' });
    await waitFor(() => expect(document.querySelector('.due-date-modal-input')).not.toBeNull());
    const input = document.querySelector('.due-date-modal-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksSetDueDate).toHaveBeenCalledWith('t1', null));
  });

  it('completed task with due date does not show overdue class', async () => {
    const pastDate = Date.now() - 86400000;
    const completedTask = { id: 't1', list_id: '1', title: 'Task 1', status: 'COMPLETED' as const, created_timestamp: 0, completed_timestamp: 1, due_date: pastDate, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    setupMockApi({ tasksGetByList: () => Promise.resolve([completedTask]) });
    render(<App />);
    await navigateToTasksPane();
    await waitFor(() => expect(document.querySelector('.task-due-date')).not.toBeNull());
    expect(document.querySelector('.task-due-date.overdue')).toBeNull();
  });

  it('D key does nothing in lists pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'd' });
    expect(document.querySelector('.due-date-modal')).toBeNull();
  });

  it('D key does nothing with multi-selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'd' });
    expect(document.querySelector('.due-date-modal')).toBeNull();
  });

  it('right-click on task shows context menu', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
    render(<App />);
    await navigateToTasksPane();
    const task = document.querySelector('.tasks-pane .task-item') as HTMLElement;
    fireEvent.contextMenu(task, { clientX: 100, clientY: 200 });
    await waitFor(() => expect(document.querySelector('.context-menu')).not.toBeNull());
    const items = document.querySelectorAll('.context-menu-item');
    expect(items.length).toBeGreaterThan(0);
    // Click a menu item to close
    fireEvent.click(items[0]);
    await waitFor(() => expect(document.querySelector('.context-menu')).toBeNull());
  });

  it('right-click on list shows context menu', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
    render(<App />);
    await navigateToUserList();
    const list = document.querySelector('.lists-pane .item.list') as HTMLElement;
    fireEvent.contextMenu(list, { clientX: 50, clientY: 100 });
    await waitFor(() => expect(document.querySelector('.context-menu')).not.toBeNull());
    // Escape closes context menu
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.context-menu')).toBeNull());
  });
});
