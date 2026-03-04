import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskActions } from './useTaskActions';
import type { Task } from '../../shared/types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1', list_id: null, title: 'Test', status: 'PENDING', parent_id: null, sort_key: '0',
  created_at: new Date(), updated_at: new Date(), created_timestamp: 0, notes: '',
  due_date: null, duration_minutes: null, completed_timestamp: null, deleted_at: null,
  ...overrides,
});

describe('useTaskActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.api = {
      tasksToggleCompleted: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof window.api;
  });

  it('cascade complete skips already-completed subtasks', async () => {
    const parent = makeTask({ id: 'p1', status: 'PENDING' });
    const child1 = makeTask({ id: 'c1', parent_id: 'p1', status: 'COMPLETED' });
    const child2 = makeTask({ id: 'c2', parent_id: 'p1', status: 'PENDING' });
    const tasks = [parent, child1, child2];
    const flatTasks = tasks.map((task, i) => ({ task, depth: task.parent_id ? 1 : 0, index: i }));

    let capturedOnConfirm: (() => void) | null = null;
    const onCascadeComplete = vi.fn((_task, _count, onConfirm) => { capturedOnConfirm = onConfirm; });

    const { result } = renderHook(() => useTaskActions({
      focusedPane: 'tasks',
      selectedSidebarItem: { type: 'list', list: { id: 'l1', name: 'List', folder_id: null, sort_key: '0', created_at: new Date(), updated_at: new Date() } },
      selectedListId: 'l1',
      selectedTask: parent,
      tasks,
      flatTasks,
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setTasks: vi.fn(),
      setSelectedTaskIndex: vi.fn(),
      setFocusedPane: vi.fn(),
      setEditMode: vi.fn(),
      setEditValue: vi.fn(),
      reloadTasks: vi.fn().mockResolvedValue(undefined),
      undoPush: vi.fn(),
      isTrashView: false,
      multiSelectClear: vi.fn(),
      showToast: vi.fn(),
      onCascadeComplete,
    }));

    await act(async () => { await result.current.toggleTaskCompleted(); });

    expect(onCascadeComplete).toHaveBeenCalledWith(parent, 2, expect.any(Function));

    await act(async () => { capturedOnConfirm!(); });

    // Should only toggle parent and pending child, NOT the already-completed child
    expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('p1');
    expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('c2');
    expect(window.api.tasksToggleCompleted).not.toHaveBeenCalledWith('c1');
    expect(window.api.tasksToggleCompleted).toHaveBeenCalledTimes(2);
  });
});
