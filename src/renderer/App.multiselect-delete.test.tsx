import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { setupMockApi, navigateToTasksPane } from './test-utils';
import type { Task, List } from '../shared/types';

const mockList: List = { id: 'list1', name: 'Test List', sort_key: 1, created_at: '2024-01-01', updated_at: '2024-01-01', folder_id: null, notes: null };

const task1: Task = { id: 't1', list_id: 'list1', title: 'Task 1', status: 'PENDING', created_timestamp: 1, completed_timestamp: null, sort_key: 1, created_at: '2024-01-01', updated_at: '2024-01-01', deleted_at: null, parent_id: null, is_expanded: true, due_date: null, duration: null, notes: null };
const task2: Task = { id: 't2', list_id: 'list1', title: 'Task 2', status: 'PENDING', created_timestamp: 2, completed_timestamp: null, sort_key: 2, created_at: '2024-01-01', updated_at: '2024-01-01', deleted_at: null, parent_id: null, is_expanded: true, due_date: null, duration: null, notes: null };
const task3: Task = { id: 't3', list_id: 'list1', title: 'Task 3', status: 'PENDING', created_timestamp: 3, completed_timestamp: null, sort_key: 3, created_at: '2024-01-01', updated_at: '2024-01-01', deleted_at: null, parent_id: null, is_expanded: true, due_date: null, duration: null, notes: null };

const parentTask: Task = { id: 'p1', list_id: 'list1', title: 'Parent', status: 'PENDING', created_timestamp: 1, completed_timestamp: null, sort_key: 1, created_at: '2024-01-01', updated_at: '2024-01-01', deleted_at: null, parent_id: null, is_expanded: false, due_date: null, duration: null, notes: null };
const childTask: Task = { id: 'c1', list_id: 'list1', title: 'Child', status: 'PENDING', created_timestamp: 2, completed_timestamp: null, sort_key: 2, created_at: '2024-01-01', updated_at: '2024-01-01', deleted_at: null, parent_id: 'p1', is_expanded: true, due_date: null, duration: null, notes: null };
const grandchildTask: Task = { id: 'g1', list_id: 'list1', title: 'Grandchild', status: 'PENDING', created_timestamp: 3, completed_timestamp: null, sort_key: 3, created_at: '2024-01-01', updated_at: '2024-01-01', deleted_at: null, parent_id: 'c1', is_expanded: true, due_date: null, duration: null, notes: null };

describe('Multi-select delete', () => {
  beforeEach(() => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([mockList]),
      tasksGetByList: vi.fn().mockResolvedValue([task1, task2, task3]),
    });
  });

  it('deletes multiple selected tasks', async () => {
    render(<App />);
    await navigateToTasksPane();
    
    // Select multiple tasks
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    
    // Delete
    fireEvent.keyDown(window, { key: 'Delete' });
    
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('t2'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('t3'));
  });

  it('deletes only selected tasks, not unselected ones', async () => {
    render(<App />);
    await navigateToTasksPane();
    
    // Select first two tasks
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    
    // Delete
    fireEvent.keyDown(window, { key: 'Delete' });
    
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('t2'));
    expect(window.api.tasksSoftDelete).not.toHaveBeenCalledWith('t3');
  });

  it('deletes nested tasks when parent is in multi-select', async () => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([mockList]),
      tasksGetByList: vi.fn().mockResolvedValue([parentTask, childTask, grandchildTask]),
    });
    render(<App />);
    await navigateToTasksPane();
    
    // Parent is already selected (collapsed with children)
    fireEvent.keyDown(window, { key: 'Delete' });
    
    // Should show cascade delete confirmation
    await waitFor(() => expect(document.querySelector('.confirmation-dialog')).toBeDefined());
    
    // Confirm deletion
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    
    // Should delete parent and all descendants
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('g1'));
  });

  it('undo restores all multi-selected deleted tasks', async () => {
    render(<App />);
    await navigateToTasksPane();
    
    // Select and delete multiple tasks
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Delete' });
    
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledTimes(2));
    
    // Undo
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('t2'));
  });

  it('redo re-deletes all multi-selected tasks', async () => {
    render(<App />);
    await navigateToTasksPane();
    
    // Select and delete multiple tasks
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Delete' });
    
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledTimes(2));
    
    // Undo
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledTimes(2));
    
    // Redo
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
    
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledTimes(4));
  });

  it('clears selection after multi-select delete', async () => {
    render(<App />);
    await navigateToTasksPane();
    
    // Select multiple tasks
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    
    // Verify multi-select is active
    await waitFor(() => expect(document.querySelectorAll('.task-item.multi-selected').length).toBe(2));
    
    // Delete
    fireEvent.keyDown(window, { key: 'Delete' });
    
    // Selection should be cleared
    await waitFor(() => expect(document.querySelectorAll('.task-item.multi-selected').length).toBe(0));
  });
});
