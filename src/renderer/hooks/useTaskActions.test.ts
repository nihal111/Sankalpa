import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskActions } from './useTaskActions';
import type { Task } from '../../shared/types';
import type { SidebarItem } from '../types';
import type { TaskWithDepth } from '../utils/taskTree';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1', list_id: null, title: 'Test', status: 'PENDING', parent_id: null, sort_key: 0,
  created_at: 0, updated_at: 0, created_timestamp: 0, notes: '',
  due_date: null, duration: null, completed_timestamp: null, deleted_at: null, is_expanded: 1,
  ...overrides,
});

describe('useTaskActions', () => {
  function mockApi(): void {
    window.api = {
      tasksCreate: vi.fn().mockResolvedValue(makeTask({ id: 'new', list_id: 'l1', sort_key: 9 })),
      tasksGetByList: vi.fn().mockResolvedValue([]),
      tasksGetInbox: vi.fn().mockResolvedValue([]),
      calcSortKey: vi.fn().mockResolvedValue(1.5),
      tasksReorder: vi.fn().mockResolvedValue(undefined),
      tasksSetParentId: vi.fn().mockResolvedValue(undefined),
      tasksRestore: vi.fn().mockResolvedValue(undefined),
      tasksDelete: vi.fn().mockResolvedValue(undefined),
      tasksToggleCompleted: vi.fn().mockResolvedValue(undefined),
      tasksSetDueDate: vi.fn().mockResolvedValue(undefined),
      tasksUpdateNotes: vi.fn().mockResolvedValue(undefined),
      tasksSoftDelete: vi.fn().mockResolvedValue(undefined),
      tasksRestoreFromTrash: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof window.api;
  }

  function renderTaskActions(params: {
    tasks: Task[];
    flatTasks: TaskWithDepth[];
    selectedTask: Task | null;
    selectedTaskIndex?: number;
    selectedSidebarItem?: SidebarItem;
    selectedListId?: string | null;
    isTrashView?: boolean;
    undoPush?: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
    showToast?: (message: string) => void;
    focusedPane?: 'lists' | 'tasks' | 'detail';
    onFlash?: (id: string) => void;
  }) {
    const selectedSidebarItem = params.selectedSidebarItem ?? { type: 'list', list: { id: 'l1', name: 'List', folder_id: null, sort_key: 1, created_at: 0, updated_at: 0, notes: null } };
    return renderHook(() => useTaskActions({
      focusedPane: params.focusedPane ?? 'tasks',
      selectedSidebarItem,
      selectedListId: params.selectedListId ?? 'l1',
      selectedTask: params.selectedTask,
      tasks: params.tasks,
      flatTasks: params.flatTasks,
      selectedTaskIndex: params.selectedTaskIndex ?? 0,
      selectedTaskIndices: new Set(),
      setTasks: vi.fn(),
      setSelectedTaskIndex: vi.fn(),
      setFocusedPane: vi.fn(),
      setEditMode: vi.fn(),
      setEditValue: vi.fn(),
      reloadTasks: vi.fn().mockResolvedValue(undefined),
      onFlash: params.onFlash,
      undoPush: params.undoPush ?? vi.fn(),
      isTrashView: params.isTrashView ?? false,
      multiSelectClear: vi.fn(),
      showToast: params.showToast ?? vi.fn(),
    }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
      configurable: true,
    });
  });

  it('cascade complete skips already-completed subtasks', async () => {
    const parent = makeTask({ id: 'p1', status: 'PENDING' });
    const child1 = makeTask({ id: 'c1', parent_id: 'p1', status: 'COMPLETED' });
    const child2 = makeTask({ id: 'c2', parent_id: 'p1', status: 'PENDING' });
    const tasks = [parent, child1, child2];
    const flatTasks: TaskWithDepth[] = tasks.map((task, i) => ({
      task,
      depth: task.parent_id ? 1 : 0,
      isLastChild: i === tasks.length - 1,
      ancestorIsLast: [],
      effectiveParentId: task.parent_id,
    }));

    let capturedOnConfirm: (() => void) | null = null;
    const onCascadeComplete = vi.fn((_task, _count, onConfirm) => { capturedOnConfirm = onConfirm; });

    const { result } = renderHook(() => useTaskActions({
      focusedPane: 'tasks',
      selectedSidebarItem: { type: 'list', list: { id: 'l1', name: 'List', folder_id: null, notes: null, sort_key: 0, created_at: 0, updated_at: 0 } },
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

  it('createTaskBelow inserts sibling and restores parent on redo', async () => {
    const parent = makeTask({ id: 'p1' });
    const selected = makeTask({ id: 'c1', parent_id: 'p1', list_id: 'l1', sort_key: 2 });
    const nextSibling = makeTask({ id: 'c2', parent_id: 'p1', list_id: 'l1', sort_key: 4 });
    const created = makeTask({ id: 'new', parent_id: 'p1', list_id: 'l1', sort_key: 2.5, created_at: 10, updated_at: 10, created_timestamp: 10 });
    const tasks = [parent, selected, nextSibling];
    const flatTasks: TaskWithDepth[] = [
      { task: parent, depth: 0, isLastChild: false, ancestorIsLast: [], effectiveParentId: null },
      { task: selected, depth: 1, isLastChild: false, ancestorIsLast: [false], effectiveParentId: 'p1' },
      { task: nextSibling, depth: 1, isLastChild: true, ancestorIsLast: [false], effectiveParentId: 'p1' },
    ];
    (window.api.calcSortKey as ReturnType<typeof vi.fn>).mockResolvedValue(2.5);
    (window.api.tasksCreate as ReturnType<typeof vi.fn>).mockResolvedValue(created);
    (window.api.tasksGetByList as ReturnType<typeof vi.fn>).mockResolvedValue([...tasks, created]);
    const undoPush = vi.fn();
    const { result } = renderTaskActions({ tasks, flatTasks, selectedTask: selected, selectedTaskIndex: 1, undoPush });

    await act(async () => { await result.current.createTaskBelow(); });

    expect(window.api.calcSortKey).toHaveBeenCalledWith(2, 4);
    expect(window.api.tasksSetParentId).toHaveBeenCalledWith(expect.any(String), 'p1');
    expect(window.api.tasksReorder).toHaveBeenCalledWith(expect.any(String), 2.5);
    const entry = undoPush.mock.calls[0][0] as { redo: () => Promise<void> };
    await act(async () => { await entry.redo(); });
    expect(window.api.tasksSetParentId).toHaveBeenCalledWith(expect.any(String), 'p1');
  });

  it('duplicateTask toggles completed state for completed source tasks', async () => {
    const selected = makeTask({ id: 'done1', list_id: 'l1', status: 'COMPLETED', sort_key: 1 });
    const tasks = [selected];
    const flatTasks: TaskWithDepth[] = [{ task: selected, depth: 0, isLastChild: true, ancestorIsLast: [], effectiveParentId: null }];
    const undoPush = vi.fn();
    const { result } = renderTaskActions({ tasks, flatTasks, selectedTask: selected, undoPush });

    await act(async () => { await result.current.duplicateTask(); });

    expect(window.api.tasksCreate).toHaveBeenCalled();
    expect(window.api.tasksToggleCompleted).toHaveBeenCalled();
    const entry = undoPush.mock.calls[0][0] as { redo: () => Promise<void> };
    await act(async () => { await entry.redo(); });
    expect((window.api.tasksCreate as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('copyTasks writes markdown and shows plural toast for multi-selection', async () => {
    const t1 = makeTask({ id: 'a1', list_id: 'l1', title: 'Alpha' });
    const t2 = makeTask({ id: 'b1', list_id: 'l1', title: 'Beta', parent_id: 'a1' });
    const flatTasks: TaskWithDepth[] = [
      { task: t1, depth: 0, isLastChild: false, ancestorIsLast: [], effectiveParentId: null },
      { task: t2, depth: 1, isLastChild: true, ancestorIsLast: [false], effectiveParentId: 'a1' },
    ];
    const showToast = vi.fn();
    const { result } = renderHook(() => useTaskActions({
      focusedPane: 'tasks',
      selectedSidebarItem: { type: 'list', list: { id: 'l1', name: 'List', folder_id: null, sort_key: 1, created_at: 0, updated_at: 0, notes: null } },
      selectedListId: 'l1',
      selectedTask: t1,
      tasks: [t1, t2],
      flatTasks,
      selectedTaskIndex: 0,
      selectedTaskIndices: new Set([0, 1]),
      setTasks: vi.fn(),
      setSelectedTaskIndex: vi.fn(),
      setFocusedPane: vi.fn(),
      setEditMode: vi.fn(),
      setEditValue: vi.fn(),
      reloadTasks: vi.fn().mockResolvedValue(undefined),
      undoPush: vi.fn(),
      isTrashView: false,
      multiSelectClear: vi.fn(),
      showToast,
    }));

    await act(async () => { await result.current.copyTasks(); });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('- Alpha\n  - Beta');
    expect(showToast).toHaveBeenCalledWith('2 tasks copied to clipboard');
  });

  it('createFromClipboard skips when in trash view', async () => {
    const selected = makeTask({ id: 's1' });
    const flatTasks: TaskWithDepth[] = [{ task: selected, depth: 0, isLastChild: true, ancestorIsLast: [], effectiveParentId: null }];
    const { result } = renderTaskActions({ tasks: [selected], flatTasks, selectedTask: selected, isTrashView: true });

    await act(async () => { await result.current.createFromClipboard(); });

    expect(navigator.clipboard.readText).not.toHaveBeenCalled();
  });

  it('createFromClipboard creates nested tasks and shows toast', async () => {
    const selected = makeTask({ id: 's1' });
    const flatTasks: TaskWithDepth[] = [{ task: selected, depth: 0, isLastChild: true, ancestorIsLast: [], effectiveParentId: null }];
    (navigator.clipboard.readText as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('- Parent\n  - Child');
    const showToast = vi.fn();
    const undoPush = vi.fn();
    const { result } = renderTaskActions({ tasks: [selected], flatTasks, selectedTask: selected, showToast, undoPush });

    await act(async () => { await result.current.createFromClipboard(); });

    expect(window.api.tasksCreate).toHaveBeenCalledTimes(2);
    expect(window.api.tasksSetParentId).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('Created 2 tasks from clipboard');
    expect(undoPush).toHaveBeenCalledTimes(1);
  });

  it('createFromClipboard shows failure toast on clipboard error', async () => {
    const selected = makeTask({ id: 's1' });
    const flatTasks: TaskWithDepth[] = [{ task: selected, depth: 0, isLastChild: true, ancestorIsLast: [], effectiveParentId: null }];
    (navigator.clipboard.readText as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('blocked'));
    const showToast = vi.fn();
    const { result } = renderTaskActions({ tasks: [selected], flatTasks, selectedTask: selected, showToast });

    await act(async () => { await result.current.createFromClipboard(); });

    expect(showToast).toHaveBeenCalledWith('Failed to create from clipboard');
  });

  it('toggleTaskCompleted is a no-op outside tasks pane', async () => {
    const task = makeTask({ id: 't-out' });
    const flatTasks: TaskWithDepth[] = [{ task, depth: 0, isLastChild: true, ancestorIsLast: [], effectiveParentId: null }];
    const { result } = renderTaskActions({ tasks: [task], flatTasks, selectedTask: task, focusedPane: 'lists' });

    await act(async () => { await result.current.toggleTaskCompleted(); });

    expect(window.api.tasksToggleCompleted).not.toHaveBeenCalled();
  });

  it('copyTasks returns early when no flat task exists for selected index', async () => {
    const task = makeTask({ id: 't-copy' });
    const showToast = vi.fn();
    const { result } = renderHook(() => useTaskActions({
      focusedPane: 'tasks',
      selectedSidebarItem: { type: 'list', list: { id: 'l1', name: 'List', folder_id: null, sort_key: 1, created_at: 0, updated_at: 0, notes: null } },
      selectedListId: 'l1',
      selectedTask: task,
      tasks: [task],
      flatTasks: [],
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
      showToast,
    }));

    await act(async () => { await result.current.copyTasks(); });

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('createFromClipboard targets inbox (null list) for smart-list context', async () => {
    const task = makeTask({ id: 'smart-task' });
    const flatTasks: TaskWithDepth[] = [{ task, depth: 0, isLastChild: true, ancestorIsLast: [], effectiveParentId: null }];
    (navigator.clipboard.readText as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('- Inbox task');
    const { result } = renderTaskActions({
      tasks: [task],
      flatTasks,
      selectedTask: task,
      selectedSidebarItem: { type: 'smart', smartList: { id: 'inbox', name: 'Inbox', icon: '<svg />' } },
      selectedListId: null,
    });

    await act(async () => { await result.current.createFromClipboard(); });

    expect(window.api.tasksCreate).toHaveBeenCalledWith(expect.any(String), null, 'Inbox task');
  });

  it('duplicateTask preserves parent linkage and triggers flash callback', async () => {
    const parent = makeTask({ id: 'p1', list_id: 'l1', status: 'PENDING' });
    const child = makeTask({ id: 'c1', list_id: 'l1', status: 'PENDING', parent_id: 'p1' });
    const tasks = [parent, child];
    const flatTasks: TaskWithDepth[] = [
      { task: parent, depth: 0, isLastChild: false, ancestorIsLast: [], effectiveParentId: null },
      { task: child, depth: 1, isLastChild: true, ancestorIsLast: [false], effectiveParentId: 'p1' },
    ];
    const onFlash = vi.fn();
    const undoPush = vi.fn();
    const { result } = renderTaskActions({ tasks, flatTasks, selectedTask: child, selectedTaskIndex: 1, onFlash, undoPush });

    await act(async () => { await result.current.duplicateTask(); });

    expect(window.api.tasksSetParentId).toHaveBeenCalled();
    expect(onFlash).toHaveBeenCalledWith(expect.any(String));
    const entry = undoPush.mock.calls[0][0] as { redo: () => Promise<void> };
    await act(async () => { await entry.redo(); });
    expect((window.api.tasksSetParentId as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
