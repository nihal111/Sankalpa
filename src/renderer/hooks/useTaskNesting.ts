import { useCallback } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';
import type { UndoEntry } from './useUndoStack';
import { type TaskWithDepth, canIndent, canOutdent, hasChildren, getDescendantIds } from '../utils/taskTree';

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

export function useTaskNesting(params: UseTaskNestingParams): TaskNestingActions {
  const { focusedPane, selectedTaskIndex, tasks, flatTasks, setSelectedTaskIndex, reloadTasks, onFlash, onThrob, undoPush } = params;

  const handleReorder = useCallback(async (direction: -1 | 1) => {
    if (focusedPane !== 'tasks' || flatTasks.length === 0) return;
    const flatTask = flatTasks[selectedTaskIndex];
    if (!flatTask) return;
    const task = flatTask.task;

    const descendantIds = !task.is_expanded ? getDescendantIds(task.id, tasks) : [];
    const subtreeSize = 1 + descendantIds.length;
    const newIndex = direction === -1 ? selectedTaskIndex - 1 : selectedTaskIndex + subtreeSize;
    if (newIndex < 0 || newIndex >= flatTasks.length) return;

    const taskAboveIndex = direction === -1 ? newIndex - 1 : newIndex;
    const taskAbove = taskAboveIndex >= 0 ? flatTasks[taskAboveIndex] : null;
    const maxDepth = taskAbove ? taskAbove.depth + 1 : 0;
    const newDepth = Math.min(flatTask.depth, maxDepth);

    let newParentId: string | null = null;
    if (newDepth > 0 && taskAbove) {
      if (newDepth === 1) newParentId = taskAbove.depth === 0 ? taskAbove.task.id : taskAbove.task.parent_id;
      else if (newDepth === 2) newParentId = taskAbove.depth >= 1 ? (taskAbove.depth === 1 ? taskAbove.task.id : taskAbove.task.parent_id) : null;
    }

    const orphanedChildren = task.is_expanded ? tasks.filter(t => t.parent_id === task.id) : [];
    const oldOrphanParents = orphanedChildren.map(c => ({ id: c.id, parentId: c.parent_id }));
    const orphanNewParent = task.parent_id;

    const neighbor = flatTasks[direction === -1 ? newIndex : selectedTaskIndex + 1];
    if (!neighbor) return;

    const origItemSortKey = task.sort_key;
    const origNeighborSortKey = neighbor.task.sort_key;
    const oldParentId = task.parent_id;

    await window.api.tasksReorder(task.id, neighbor.task.sort_key);
    await window.api.tasksReorder(neighbor.task.id, task.sort_key);
    if (newParentId !== oldParentId) await window.api.tasksSetParentId(task.id, newParentId);
    for (const child of orphanedChildren) await window.api.tasksSetParentId(child.id, orphanNewParent);

    await reloadTasks();
    setSelectedTaskIndex(direction === -1 ? newIndex : selectedTaskIndex + 1);
    onFlash?.(task.id);

    undoPush({
      undo: async () => {
        await window.api.tasksReorder(task.id, origItemSortKey);
        await window.api.tasksReorder(neighbor.task.id, origNeighborSortKey);
        if (newParentId !== oldParentId) await window.api.tasksSetParentId(task.id, oldParentId);
        for (const { id, parentId } of oldOrphanParents) await window.api.tasksSetParentId(id, parentId);
      },
      redo: async () => {
        await window.api.tasksReorder(task.id, neighbor.task.sort_key);
        await window.api.tasksReorder(neighbor.task.id, task.sort_key);
        if (newParentId !== oldParentId) await window.api.tasksSetParentId(task.id, newParentId);
        for (const child of orphanedChildren) await window.api.tasksSetParentId(child.id, orphanNewParent);
      },
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
