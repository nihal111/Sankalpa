import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDueDateState } from './useDueDateState';
import type { Task } from '../../shared/types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  list_id: null,
  title: 'Test',
  status: 'PENDING',
  parent_id: null,
  sort_key: 0,
  created_at: 0,
  updated_at: 0,
  created_timestamp: 0,
  notes: '',
  due_date: null,
  duration: null,
  completed_timestamp: null,
  deleted_at: null,
  is_expanded: 1,
  ...overrides,
});

describe('useDueDateState', () => {
  it('start does nothing when focusedPane is not tasks or detail', () => {
    const { result } = renderHook(() => useDueDateState({
      focusedPane: 'lists',
      selectedTask: makeTask(),
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
