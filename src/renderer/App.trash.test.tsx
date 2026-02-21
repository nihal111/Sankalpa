import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi } from './test-utils';
import type { Task } from '../shared/types';

const trashedTask: Task = {
  id: 'trash1', list_id: '1', title: 'Trashed Task', status: 'PENDING',
  created_timestamp: 0, completed_timestamp: null, due_date: null,
  sort_key: 1, created_at: 0, updated_at: 0, deleted_at: 1000,
};

const trashedTaskNoList: Task = {
  id: 'trash2', list_id: 'deleted-list', title: 'Orphan Task', status: 'PENDING',
  created_timestamp: 0, completed_timestamp: null, due_date: null,
  sort_key: 2, created_at: 0, updated_at: 0, deleted_at: 1000,
};

const trashedInboxTask: Task = {
  id: 'trash3', list_id: null, title: 'Inbox Trashed', status: 'PENDING',
  created_timestamp: 0, completed_timestamp: null, due_date: null,
  sort_key: 3, created_at: 0, updated_at: 0, deleted_at: 1000,
};

async function navigateToTrash(): Promise<void> {
  await waitFor(() => expect(document.querySelector('.trash-list .item')).not.toBeNull());
  for (let i = 0; i < 7; i++) {
    fireEvent.keyDown(window, { key: 'ArrowDown' });
  }
  await waitFor(() => expect(document.querySelector('.trash-list .item.selected')).not.toBeNull());
}

async function navigateToTrashTasks(): Promise<void> {
  await navigateToTrash();
  fireEvent.keyDown(window, { key: 'Tab' });
}

describe('App trash', () => {
  beforeEach(() => {
    setupMockApi({
      tasksGetTrashed: vi.fn().mockResolvedValue([trashedTask]),
    });
  });

  it('shows trashed tasks when navigating to Trash', async () => {
    render(<App />);
    await navigateToTrash();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
  });

  it('shows source list name in trash view', async () => {
    render(<App />);
    await navigateToTrash();
    await waitFor(() => expect(document.querySelector('.task-source-list')).not.toBeNull());
  });

  it('shows Inbox as source for tasks with null list_id', async () => {
    setupMockApi({
      tasksGetTrashed: vi.fn().mockResolvedValue([trashedInboxTask]),
    });
    render(<App />);
    await navigateToTrash();
    await waitFor(() => expect(screen.getByText('Inbox Trashed')).toBeDefined());
    await waitFor(() => expect(document.querySelector('.task-source-list')?.textContent).toBe('Inbox'));
  });

  it('Delete in trash view shows permanent delete confirmation', async () => {
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(screen.getByText('Permanently Delete')).toBeDefined());
  });

  it('confirming permanent delete calls tasksDelete', async () => {
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(screen.getByText('Permanently Delete')).toBeDefined());
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('trash1'));
  });

  it('Cancel dismisses confirmation dialog', async () => {
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(document.querySelector('.confirmation-dialog')).not.toBeNull());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(document.querySelector('.confirmation-dialog')).toBeNull());
  });

  it('clicking overlay dismisses confirmation dialog', async () => {
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(document.querySelector('.modal-overlay')).not.toBeNull());
    fireEvent.click(document.querySelector('.modal-overlay')!);
    await waitFor(() => expect(document.querySelector('.confirmation-dialog')).toBeNull());
  });

  it('clicking dialog body does not dismiss it', async () => {
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(document.querySelector('.confirmation-dialog')).not.toBeNull());
    fireEvent.click(document.querySelector('.confirmation-dialog')!);
    expect(document.querySelector('.confirmation-dialog')).not.toBeNull();
  });

  it('R key restores task from trash', async () => {
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Trashed Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'r' });
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('trash1'));
  });

  it('R key shows dialog when original list is deleted', async () => {
    setupMockApi({
      tasksGetTrashed: vi.fn().mockResolvedValue([trashedTaskNoList]),
    });
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Orphan Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'r' });
    await waitFor(() => expect(screen.getByText('Restore Task')).toBeDefined());
    expect(screen.getByText('Restore to Inbox')).toBeDefined();
  });

  it('Restore to Inbox moves task to inbox', async () => {
    setupMockApi({
      tasksGetTrashed: vi.fn().mockResolvedValue([trashedTaskNoList]),
    });
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Orphan Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'r' });
    await waitFor(() => expect(screen.getByText('Restore to Inbox')).toBeDefined());
    fireEvent.click(screen.getByText('Restore to Inbox'));
    await waitFor(() => expect(window.api.tasksSetListId).toHaveBeenCalledWith('trash2', null));
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('trash2'));
  });

  it('Create list and restore option works', async () => {
    setupMockApi({
      tasksGetTrashed: vi.fn().mockResolvedValue([trashedTaskNoList]),
      listsCreate: vi.fn().mockResolvedValue({ id: 'new-list', folder_id: null, name: 'deleted-list', sort_key: 3, created_at: 0, updated_at: 0 }),
    });
    render(<App />);
    await navigateToTrashTasks();
    await waitFor(() => expect(screen.getByText('Orphan Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'r' });
    await waitFor(() => expect(screen.getByText(/Create "deleted-list" and restore/)).toBeDefined());
    fireEvent.click(screen.getByText(/Create "deleted-list" and restore/));
    await waitFor(() => expect(window.api.tasksSetListId).toHaveBeenCalledWith('trash2', 'new-list'));
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('trash2'));
  });

  it('R key does nothing when not in trash view', async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelector('.trash-list .item')).not.toBeNull());
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'r' });
    expect(window.api.tasksRestoreFromTrash).not.toHaveBeenCalled();
  });

  it('R key does nothing when trash is empty', async () => {
    setupMockApi({
      tasksGetTrashed: vi.fn().mockResolvedValue([]),
    });
    render(<App />);
    await navigateToTrashTasks();
    fireEvent.keyDown(window, { key: 'r' });
    expect(window.api.tasksRestoreFromTrash).not.toHaveBeenCalled();
  });
});
