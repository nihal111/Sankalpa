import { useCallback } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';
import type { SidebarItem } from '../utils/buildSidebarItems';
import type { UndoEntry } from './useUndoStack';

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
  undoPush: (entry: UndoEntry) => void;
}

interface TaskActions {
  createTask: () => Promise<void>;
  toggleTaskCompleted: () => Promise<void>;
  deleteTask: () => Promise<void>;
  handleReorder: (direction: -1 | 1) => Promise<void>;
}

export function useTaskActions(params: UseTaskActionsParams): TaskActions {
  const {
    focusedPane, selectedSidebarItem, selectedListId, selectedTaskIndex, tasks,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash, undoPush,
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
    undoPush({ execute: async () => { await window.api.tasksDelete(newTask.id); } });
  }, [selectedListId, selectedSidebarItem, setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, onFlash, undoPush]);

  const toggleTaskCompleted = useCallback(async () => {
    if (focusedPane !== 'tasks' || tasks.length === 0) return;
    const task = tasks[selectedTaskIndex];
    if (!task) return;
    await window.api.tasksToggleCompleted(task.id);
    await reloadTasks();
  }, [focusedPane, selectedTaskIndex, tasks, reloadTasks]);

  const deleteTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || tasks.length === 0) return;
    const task = tasks[selectedTaskIndex];
    if (!task) return;
    const { id, list_id, title, status, created_timestamp, completed_timestamp, sort_key, created_at, updated_at } = task;
    await window.api.tasksDelete(task.id);
    await reloadTasks();
    setSelectedTaskIndex((i: number) => Math.min(i, tasks.length - 2));
    undoPush({ execute: async () => { await window.api.tasksRestore(id, list_id, title, status, created_timestamp, completed_timestamp, sort_key, created_at, updated_at); } });
  }, [focusedPane, tasks, selectedTaskIndex, reloadTasks, setSelectedTaskIndex, undoPush]);

  const handleReorder = useCallback(async (direction: -1 | 1) => {
    if (focusedPane === 'tasks') {
      const newIndex = selectedTaskIndex + direction;
      if (newIndex < 0 || newIndex >= tasks.length) return;
      const item = tasks[selectedTaskIndex];
      const neighbor = tasks[newIndex];
      const origItemSortKey = item.sort_key;
      const origNeighborSortKey = neighbor.sort_key;
      await window.api.tasksReorder(item.id, neighbor.sort_key);
      await window.api.tasksReorder(neighbor.id, item.sort_key);
      await reloadTasks();
      setSelectedTaskIndex(newIndex);
      onFlash?.(item.id);
      undoPush({ execute: async () => {
        await window.api.tasksReorder(item.id, origItemSortKey);
        await window.api.tasksReorder(neighbor.id, origNeighborSortKey);
      } });
    }
  }, [focusedPane, selectedTaskIndex, tasks, reloadTasks, setSelectedTaskIndex, onFlash, undoPush]);

  return { createTask, toggleTaskCompleted, deleteTask, handleReorder };
}
