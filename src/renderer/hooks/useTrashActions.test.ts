import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrashActions } from './useTrashActions';

describe('useTrashActions', () => {
  it('handleCascadeComplete shows confirmation dialog', () => {
    const { result } = renderHook(() => useTrashActions({
      isTrashView: false,
      tasks: [],
      flatTasks: [],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks: vi.fn(),
      undoPush: vi.fn(),
    }));

    const task = { id: '1', list_id: null, title: 'Test', status: 'PENDING', parent_id: null, sort_key: '0', created_at: new Date(), updated_at: new Date(), created_timestamp: 0, notes: '', due_date: null, duration_minutes: null, completed_timestamp: null, deleted_at: null };
    const onConfirm = vi.fn();

    act(() => {
      result.current.handleCascadeComplete(task, 2, onConfirm);
    });

    expect(result.current.confirmationDialog).not.toBeNull();
    expect(result.current.confirmationDialog?.title).toBe('Complete Task');
  });

  it('handleCascadeDelete shows confirmation dialog', () => {
    const { result } = renderHook(() => useTrashActions({
      isTrashView: false,
      tasks: [],
      flatTasks: [],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks: vi.fn(),
      undoPush: vi.fn(),
    }));

    const task = { id: '1', list_id: null, title: 'Test', status: 'PENDING', parent_id: null, sort_key: '0', created_at: new Date(), updated_at: new Date(), created_timestamp: 0, notes: '', due_date: null, duration_minutes: null, completed_timestamp: null, deleted_at: null };
    const onConfirm = vi.fn();

    act(() => {
      result.current.handleCascadeDelete(task, 2, onConfirm);
    });

    expect(result.current.confirmationDialog).not.toBeNull();
    expect(result.current.confirmationDialog?.title).toBe('Delete Task');
  });

  it('closeConfirmationDialog clears dialog', () => {
    const { result } = renderHook(() => useTrashActions({
      isTrashView: false,
      tasks: [],
      flatTasks: [],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks: vi.fn(),
      undoPush: vi.fn(),
    }));

    const task = { id: '1', list_id: null, title: 'Test', status: 'PENDING', parent_id: null, sort_key: '0', created_at: new Date(), updated_at: new Date(), created_timestamp: 0, notes: '', due_date: null, duration_minutes: null, completed_timestamp: null, deleted_at: null };
    act(() => {
      result.current.handleCascadeDelete(task, 1, vi.fn());
    });
    expect(result.current.confirmationDialog).not.toBeNull();

    act(() => {
      result.current.closeConfirmationDialog();
    });
    expect(result.current.confirmationDialog).toBeNull();
  });
});
