import { useCallback } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';
import type { SidebarItem } from '../utils/buildSidebarItems';
import type { UndoEntry } from './useUndoStack';
import { getDescendantIds } from '../utils/taskTree';

interface UseTaskActionsParams {
  focusedPane: Pane;
  selectedSidebarItem: SidebarItem | undefined;
  selectedListId: string | null;
  selectedTaskIndex: number;
  tasks: Task[];
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
}

interface TaskActions {
  createTask: () => Promise<void>;
  toggleTaskCompleted: () => Promise<void>;
  deleteTask: () => Promise<void>;
}

export function useTaskActions(params: UseTaskActionsParams): TaskActions {
  const {
    focusedPane, selectedSidebarItem, selectedListId, selectedTaskIndex, tasks,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash, onCompleteFlash, undoPush,
    isTrashView, onPermanentDeleteRequest, onCascadeComplete, onCascadeDelete,
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
    if (focusedPane !== 'tasks' || tasks.length === 0) return;
    const task = tasks[selectedTaskIndex];
    if (!task) return;

    const descendantIds = getDescendantIds(task.id, tasks);
    if (descendantIds.length > 0 && task.status !== 'COMPLETED') {
      onCascadeComplete?.(task, descendantIds.length, async () => {
        await window.api.tasksToggleCompleted(task.id);
        for (const id of descendantIds) await window.api.tasksToggleCompleted(id);
        await reloadTasks();
      });
      return;
    }

    await window.api.tasksToggleCompleted(task.id);
    onCompleteFlash?.(task.id, task.status === 'COMPLETED');
    await reloadTasks();
  }, [focusedPane, selectedTaskIndex, tasks, reloadTasks, onCascadeComplete, onCompleteFlash]);

  const deleteTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || tasks.length === 0) return;
    const task = tasks[selectedTaskIndex];
    if (!task) return;

    if (isTrashView) { onPermanentDeleteRequest?.(task); return; }

    const descendantIds = getDescendantIds(task.id, tasks);
    const doDelete = async () => {
      const { id } = task;
      await window.api.tasksDelete(task.id);
      for (const descId of descendantIds) await window.api.tasksDelete(descId);
      await reloadTasks();
      setSelectedTaskIndex((i: number) => Math.min(i, tasks.length - 2 - descendantIds.length));
      undoPush({
        undo: async () => {
          await window.api.tasksRestoreFromTrash(id);
          for (const descId of descendantIds) await window.api.tasksRestoreFromTrash(descId);
        },
        redo: async () => {
          await window.api.tasksDelete(id);
          for (const descId of descendantIds) await window.api.tasksDelete(descId);
        },
      });
    };

    if (descendantIds.length > 0) { onCascadeDelete?.(task, descendantIds.length, doDelete); return; }
    await doDelete();
  }, [focusedPane, tasks, selectedTaskIndex, reloadTasks, setSelectedTaskIndex, undoPush, isTrashView, onPermanentDeleteRequest, onCascadeDelete]);

  return { createTask, toggleTaskCompleted, deleteTask };
}
