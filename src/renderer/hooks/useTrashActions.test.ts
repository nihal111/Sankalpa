import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrashActions } from './useTrashActions';
import type { Task } from '../../shared/types';
import type { TaskWithDepth } from '../utils/taskTree';

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

const makeFlatTask = (task: Task, depth = 0): TaskWithDepth => ({
  task,
  depth,
  isLastChild: true,
  ancestorIsLast: [],
  effectiveParentId: task.parent_id,
});

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

    const task = makeTask();
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

    const task = makeTask();
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

    const task = makeTask();
    act(() => {
      result.current.handleCascadeDelete(task, 1, vi.fn());
    });
    expect(result.current.confirmationDialog).not.toBeNull();

    act(() => {
      result.current.closeConfirmationDialog();
    });
    expect(result.current.confirmationDialog).toBeNull();
  });

  it('handlePermanentDeleteRequest shows confirmation for single task', () => {
    const task = makeTask();
    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [task],
      flatTasks: [makeFlatTask(task)],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks: vi.fn(),
      undoPush: vi.fn(),
    }));

    act(() => {
      result.current.handlePermanentDeleteRequest(task);
    });

    expect(result.current.confirmationDialog).not.toBeNull();
    expect(result.current.confirmationDialog?.title).toBe('Permanently Delete');
  });

  it('handlePermanentDeleteRequest executes delete action', async () => {
    const task = makeTask();
    const reloadTasks = vi.fn().mockResolvedValue(undefined);
    let capturedUndo: (() => Promise<void>) | null = null;
    const undoPush = vi.fn().mockImplementation((entry: { undo: () => Promise<void> }) => { capturedUndo = entry.undo; });

    window.api = {
      tasksDelete: vi.fn().mockResolvedValue(undefined),
      tasksRestore: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof window.api;

    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [task],
      flatTasks: [makeFlatTask(task)],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks,
      undoPush,
    }));

    act(() => {
      result.current.handlePermanentDeleteRequest(task);
    });

    await act(async () => {
      await result.current.confirmationDialog?.options[0].action();
    });

    expect(window.api.tasksDelete).toHaveBeenCalledWith('1');

    if (capturedUndo) {
      await act(async () => {
        await capturedUndo!();
      });
      expect(window.api.tasksRestore).toHaveBeenCalled();
    }
  });

  it('handleRestoreTask restores task from trash', async () => {
    const task = makeTask({ deleted_at: 123 });
    const reloadTasks = vi.fn().mockResolvedValue(undefined);
    const multiSelectClear = vi.fn();
    const setSelectedTaskIndex = vi.fn();
    const undoPush = vi.fn();

    window.api = {
      tasksRestoreFromTrash: vi.fn().mockResolvedValue(undefined),
      tasksSoftDelete: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof window.api;

    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [task],
      flatTasks: [makeFlatTask(task)],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex,
      multiSelectClear,
      reloadTasks,
      undoPush,
    }));

    await act(async () => {
      await result.current.handleRestoreTask();
    });

    expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('1');
    expect(reloadTasks).toHaveBeenCalled();
  });

  it('handlePermanentDeleteRequest shows confirmation for multiple tasks', async () => {
    const task1 = makeTask({ id: '1', title: 'Test 1', sort_key: 0 });
    const task2 = makeTask({ id: '2', title: 'Test 2', sort_key: 1 });
    const reloadTasks = vi.fn().mockResolvedValue(undefined);
    let capturedUndo: (() => Promise<void>) | null = null;
    const undoPush = vi.fn().mockImplementation((entry: { undo: () => Promise<void> }) => { capturedUndo = entry.undo; });

    window.api = {
      tasksDelete: vi.fn().mockResolvedValue(undefined),
      tasksRestore: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof window.api;

    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [task1, task2],
      flatTasks: [makeFlatTask(task1), makeFlatTask(task2)],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set([0, 1]),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks,
      undoPush,
    }));

    act(() => {
      result.current.handlePermanentDeleteRequest(task1);
    });

    expect(result.current.confirmationDialog?.message).toContain('2 selected tasks');

    await act(async () => {
      await result.current.confirmationDialog?.options[0].action();
    });

    if (capturedUndo) {
      await act(async () => {
        await capturedUndo!();
      });
      expect(window.api.tasksRestore).toHaveBeenCalledTimes(2);
    }
  });

  it('handlePermanentDeleteRequest does nothing with empty tasks', () => {
    const task = makeTask();
    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
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

    act(() => {
      result.current.handlePermanentDeleteRequest(task);
    });

    expect(result.current.confirmationDialog).toBeNull();
  });

  it('handleRestoreTask does nothing with empty flatTasks', async () => {
    const reloadTasks = vi.fn();
    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [],
      flatTasks: [],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks,
      undoPush: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleRestoreTask();
    });

    expect(reloadTasks).not.toHaveBeenCalled();
  });

  it('handlePermanentDeleteRequest shows Untitled for task without title', () => {
    const task = makeTask({ title: '' });
    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [task],
      flatTasks: [makeFlatTask(task)],
      lists: [],
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set(),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks: vi.fn(),
      undoPush: vi.fn(),
    }));

    act(() => {
      result.current.handlePermanentDeleteRequest(task);
    });

    expect(result.current.confirmationDialog?.message).toContain('Untitled');
  });

  it('handleRestoreTask does nothing when selected indices are out of bounds', async () => {
    const task = makeTask();
    const reloadTasks = vi.fn();
    const { result } = renderHook(() => useTrashActions({
      isTrashView: true,
      tasks: [task],
      flatTasks: [makeFlatTask(task)],
      lists: [],
      selectedTaskIndex: 5,
      selectedTaskIndices: new Set([5, 6]),
      setSelectedTaskIndex: vi.fn(),
      multiSelectClear: vi.fn(),
      reloadTasks,
      undoPush: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleRestoreTask();
    });

    expect(reloadTasks).not.toHaveBeenCalled();
  });
});
