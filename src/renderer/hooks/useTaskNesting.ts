import { useCallback } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';
import type { UndoEntry } from './useUndoStack';
import { type TaskWithDepth, canIndent, canOutdent, hasChildren } from '../utils/taskTree';
import { computeReorder, type ReorderMutation } from '../utils/taskTreeOps';

interface UseTaskNestingParams {
  focusedPane: Pane;
  selectedTaskIndex: number;
  tasks: Task[];
  flatTasks: TaskWithDepth[];
  setSelectedTaskIndex: (fn: number | ((i: number) => number)) => void;
  reloadTasks: () => Promise<void>;
  onFlash?: (id: string) => void;
  onThrob?: (id: string) => void;
  undoPush: (entry: UndoEntry) => void;
}

interface TaskNestingActions {
  handleReorder: (direction: -1 | 1) => Promise<void>;
  indentTask: () => Promise<void>;
  outdentTask: () => Promise<void>;
  toggleCollapse: () => Promise<void>;
}

async function applyMutations(mutations: ReorderMutation[]): Promise<void> {
  for (const m of mutations) {
    if (m.sortKey !== undefined) await window.api.tasksReorder(m.id, m.sortKey);
    if ('parentId' in m) await window.api.tasksSetParentId(m.id, m.parentId!);
  }
}

function invertMutations(mutations: ReorderMutation[], tasks: Task[]): ReorderMutation[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  return mutations.map(m => {
    const orig = taskMap.get(m.id)!;
    const inv: ReorderMutation = { id: m.id };
    if (m.sortKey !== undefined) inv.sortKey = orig.sort_key;
    if ('parentId' in m) inv.parentId = orig.parent_id;
    return inv;
  });
}

export function useTaskNesting(params: UseTaskNestingParams): TaskNestingActions {
  const { focusedPane, selectedTaskIndex, tasks, flatTasks, setSelectedTaskIndex, reloadTasks, onFlash, onThrob, undoPush } = params;

  const handleReorder = useCallback(async (direction: -1 | 1) => {
    if (focusedPane !== 'tasks' || flatTasks.length === 0) return;
    const result = computeReorder(flatTasks, tasks, selectedTaskIndex, direction);
    if (!result) return;

    const undoMutations = invertMutations(result.mutations, tasks);
    await applyMutations(result.mutations);
    await reloadTasks();
    setSelectedTaskIndex(result.newSelectedIndex);
    onFlash?.(flatTasks[selectedTaskIndex].task.id);

    undoPush({
      undo: async () => { await applyMutations(undoMutations); },
      redo: async () => { await applyMutations(result.mutations); },
    });
  }, [focusedPane, flatTasks, tasks, selectedTaskIndex, reloadTasks, setSelectedTaskIndex, onFlash, undoPush]);

  const indentTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || flatTasks.length === 0) return;
    const flatTask = flatTasks[selectedTaskIndex];
    if (!flatTask) return;

    if (!canIndent(selectedTaskIndex, flatTasks)) { onThrob?.(flatTask.task.id); return; }

    const taskAbove = flatTasks[selectedTaskIndex - 1].task;
    const oldParentId = flatTask.task.parent_id;
    await window.api.tasksSetParentId(flatTask.task.id, taskAbove.id);
    await reloadTasks();
    undoPush({
      undo: async () => { await window.api.tasksSetParentId(flatTask.task.id, oldParentId); },
      redo: async () => { await window.api.tasksSetParentId(flatTask.task.id, taskAbove.id); },
    });
  }, [focusedPane, flatTasks, selectedTaskIndex, reloadTasks, onThrob, undoPush]);

  const outdentTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || flatTasks.length === 0) return;
    const flatTask = flatTasks[selectedTaskIndex];
    if (!flatTask) return;

    if (!canOutdent(selectedTaskIndex, flatTasks)) { onThrob?.(flatTask.task.id); return; }

    const task = flatTask.task;
    const oldParentId = task.parent_id;
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const newParentId = taskMap.get(oldParentId!)?.parent_id ?? null;

    await window.api.tasksSetParentId(task.id, newParentId);
    await reloadTasks();
    undoPush({
      undo: async () => { await window.api.tasksSetParentId(task.id, oldParentId); },
      redo: async () => { await window.api.tasksSetParentId(task.id, newParentId); },
    });
  }, [focusedPane, flatTasks, tasks, selectedTaskIndex, reloadTasks, onThrob, undoPush]);

  const toggleCollapse = useCallback(async () => {
    if (focusedPane !== 'tasks' || flatTasks.length === 0) return;
    const flatTask = flatTasks[selectedTaskIndex];
    if (!flatTask) return;

    if (!hasChildren(flatTask.task.id, tasks)) { onThrob?.(flatTask.task.id); return; }

    await window.api.tasksToggleExpanded(flatTask.task.id);
    await reloadTasks();
  }, [focusedPane, flatTasks, tasks, selectedTaskIndex, reloadTasks, onThrob]);

  return { handleReorder, indentTask, outdentTask, toggleCollapse };
}
