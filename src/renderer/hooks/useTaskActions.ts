import { useCallback } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';
import type { SidebarItem } from '../utils/buildSidebarItems';
import type { UndoEntry } from './useUndoStack';
import type { TaskWithDepth } from '../utils/taskTree';
import { getDescendantIds } from '../utils/taskTree';
import { computeDuplicate } from '../utils/taskTreeOps';

interface UseTaskActionsParams {
  focusedPane: Pane;
  selectedSidebarItem: SidebarItem | undefined;
  selectedListId: string | null;
  selectedTask: Task | null;
  tasks: Task[];
  flatTasks: TaskWithDepth[];
  selectedTaskIndex: number;
  selectedTaskIndices: Set<number>;
  setTasks: (tasks: Task[]) => void;
  setSelectedTaskIndex: (fn: number | ((i: number) => number)) => void;
  setFocusedPane: (pane: Pane) => void;
  setEditMode: (mode: { type: 'task'; index: number }) => void;
  setEditValue: (value: string) => void;
  reloadTasks: () => Promise<void>;
  onFlash?: (id: string) => void;
  onCompleteFlash?: (id: string, wasCompleted: boolean) => void;
  undoPush: (entry: UndoEntry) => void;
  isTrashView: boolean;
  onPermanentDeleteRequest?: (task: Task) => void;
  onCascadeComplete?: (task: Task, descendantCount: number, onConfirm: () => void) => void;
  onCascadeDelete?: (task: Task, descendantCount: number, onConfirm: () => void) => void;
  multiSelectClear: () => void;
}

interface TaskActions {
  createTask: () => Promise<void>;
  toggleTaskCompleted: () => Promise<void>;
  deleteTask: () => Promise<void>;
  duplicateTask: () => Promise<void>;
}

export function useTaskActions(params: UseTaskActionsParams): TaskActions {
  const {
    focusedPane, selectedSidebarItem, selectedListId, selectedTask, tasks, flatTasks, selectedTaskIndex, selectedTaskIndices,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash, onCompleteFlash, undoPush,
    isTrashView, onPermanentDeleteRequest, onCascadeComplete, onCascadeDelete, multiSelectClear,
  } = params;

  const createTask = useCallback(async () => {
    const isInbox = selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'inbox';
    const isList = selectedSidebarItem?.type === 'list';
    if (!isInbox && !isList) return;
    const id = crypto.randomUUID();
    const listId = isList ? selectedListId : null;
    const newTask = await window.api.tasksCreate(id, listId, '');
    const newTasks = isInbox ? await window.api.tasksGetInbox() : await window.api.tasksGetByList(selectedListId!);
    const newIndex = newTasks.findIndex((t) => t.id === newTask.id);
    setTasks(newTasks);
    setSelectedTaskIndex(newIndex);
    setFocusedPane('tasks');
    setEditMode({ type: 'task', index: newIndex });
    setEditValue('');
    onFlash?.(newTask.id);
    undoPush({
      undo: async () => { await window.api.tasksDelete(newTask.id); },
      redo: async () => { await window.api.tasksRestore(newTask.id, listId, '', 'PENDING', newTask.created_timestamp, null, newTask.sort_key, newTask.created_at, newTask.updated_at); },
    });
  }, [selectedListId, selectedSidebarItem, setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, onFlash, undoPush]);

  const toggleTaskCompleted = useCallback(async () => {
    if (focusedPane !== 'tasks' || !selectedTask) return;

    const descendantIds = getDescendantIds(selectedTask.id, tasks);
    if (descendantIds.length > 0 && selectedTask.status !== 'COMPLETED') {
      onCascadeComplete?.(selectedTask, descendantIds.length, async () => {
        await window.api.tasksToggleCompleted(selectedTask.id);
        for (const id of descendantIds) await window.api.tasksToggleCompleted(id);
        await reloadTasks();
      });
      return;
    }

    await window.api.tasksToggleCompleted(selectedTask.id);
    onCompleteFlash?.(selectedTask.id, selectedTask.status === 'COMPLETED');
    await reloadTasks();
  }, [focusedPane, selectedTask, tasks, reloadTasks, onCascadeComplete, onCompleteFlash]);

  const deleteTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || !selectedTask) return;

    if (isTrashView) { onPermanentDeleteRequest?.(selectedTask); return; }

    // Get tasks to delete (multi-select or single)
    const indicesToDelete = selectedTaskIndices.size > 0 ? [...selectedTaskIndices].sort((a, b) => a - b) : [selectedTaskIndex];
    const tasksToDelete = indicesToDelete.map(i => flatTasks[i]?.task).filter(Boolean);
    if (tasksToDelete.length === 0) return;

    // Collect all descendants for each task to delete
    const allTasksToDelete = new Set<string>();
    const descendantsByTask = new Map<string, string[]>();
    for (const task of tasksToDelete) {
      allTasksToDelete.add(task.id);
      const descendants = getDescendantIds(task.id, tasks);
      descendantsByTask.set(task.id, descendants);
      descendants.forEach(id => allTasksToDelete.add(id));
    }

    const doDelete = async () => {
      for (const id of allTasksToDelete) await window.api.tasksSoftDelete(id);
      await reloadTasks();
      multiSelectClear();
      setSelectedTaskIndex(Math.min(indicesToDelete[0], flatTasks.length - allTasksToDelete.size - 1));
      undoPush({
        undo: async () => { for (const id of allTasksToDelete) await window.api.tasksRestoreFromTrash(id); },
        redo: async () => { for (const id of allTasksToDelete) await window.api.tasksSoftDelete(id); },
      });
    };

    // Check if any task has descendants
    const totalDescendants = Array.from(descendantsByTask.values()).reduce((sum, arr) => sum + arr.length, 0);
    if (totalDescendants > 0 && tasksToDelete.length === 1) {
      onCascadeDelete?.(tasksToDelete[0], totalDescendants, doDelete);
      return;
    }

    await doDelete();
  }, [focusedPane, selectedTask, tasks, flatTasks, selectedTaskIndex, selectedTaskIndices, reloadTasks, setSelectedTaskIndex, multiSelectClear, undoPush, isTrashView, onPermanentDeleteRequest, onCascadeDelete]);

  const duplicateTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || !selectedTask || isTrashView) return;
    const specs = computeDuplicate(selectedTask, tasks);
    const allIds = specs.map(s => s.newId);
    
    for (const spec of specs) {
      await window.api.tasksCreate(spec.newId, spec.task.list_id, spec.task.title);
      if (spec.newParentId) await window.api.tasksSetParentId(spec.newId, spec.newParentId);
      await window.api.tasksSetDueDate(spec.newId, spec.task.due_date);
      await window.api.tasksUpdateNotes(spec.newId, spec.task.notes);
      if (spec.task.status === 'COMPLETED') await window.api.tasksToggleCompleted(spec.newId);
    }
    
    await reloadTasks();
    onFlash?.(specs[0].newId);
    undoPush({
      undo: async () => { for (const id of allIds) await window.api.tasksDelete(id); },
      redo: async () => {
        for (const spec of specs) {
          await window.api.tasksCreate(spec.newId, spec.task.list_id, spec.task.title);
          if (spec.newParentId) await window.api.tasksSetParentId(spec.newId, spec.newParentId);
          await window.api.tasksSetDueDate(spec.newId, spec.task.due_date);
          await window.api.tasksUpdateNotes(spec.newId, spec.task.notes);
          if (spec.task.status === 'COMPLETED') await window.api.tasksToggleCompleted(spec.newId);
        }
      },
    });
  }, [focusedPane, selectedTask, isTrashView, tasks, reloadTasks, onFlash, undoPush]);

  return { createTask, toggleTaskCompleted, deleteTask, duplicateTask };
}
