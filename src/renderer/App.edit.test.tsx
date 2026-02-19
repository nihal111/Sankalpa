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
    fireEvent.keyDown(window, { key: 'Tab' });
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
    expect(document.querySelector('.tasks-pane .edit-input')).toBeNull();
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
    fireEvent.keyDown(window, { key: 'Tab' });
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
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(window.api.tasksToggleCompleted).not.toHaveBeenCalled();
  });

  it('deletes task from inbox and reloads', async () => {
    const inboxTasks = [
      { id: 'inbox-t1', list_id: null, title: 'Inbox Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 1, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      tasksGetInbox: vi.fn().mockResolvedValue(inboxTasks),
      tasksDelete: vi.fn().mockResolvedValue(undefined),
    });
    render(<App />);
    // Smart Inbox is selected by default
    await waitFor(() => expect(screen.getByText('Inbox Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('inbox-t1'));
    expect(window.api.tasksGetInbox).toHaveBeenCalled();
  });

  it('Delete does nothing in lists pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(window.api.tasksDelete).not.toHaveBeenCalled();
  });
});
