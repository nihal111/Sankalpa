import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDueDateState } from './useDueDateState';

describe('useDueDateState', () => {
  it('start does nothing when focusedPane is not tasks or detail', () => {
    const { result } = renderHook(() => useDueDateState({
      focusedPane: 'lists',
      selectedTask: { id: '1', list_id: null, title: 'Test', status: 'PENDING', parent_id: null, sort_key: '0', created_at: new Date(), updated_at: new Date(), created_timestamp: 0, notes: '', due_date: null, duration_minutes: null, completed_timestamp: null, deleted_at: null },
      selectedTaskIndex: 0,
      reloadTasks: vi.fn(),
    }));

    act(() => {
      result.current[1].start();
    });

    expect(result.current[0]).toBeNull();
  });

  it('commit does nothing when taskIdRef is null', async () => {
    const reloadTasks = vi.fn();
    const { result } = renderHook(() => useDueDateState({
      focusedPane: 'tasks',
      selectedTask: null,
      selectedTaskIndex: 0,
      reloadTasks,
    }));

    await act(async () => {
      await result.current[1].commit(Date.now());
    });

    expect(reloadTasks).not.toHaveBeenCalled();
  });
});
