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
  showToast: (msg: string) => void;
}

interface TaskActions {
  createTask: () => Promise<void>;
  toggleTaskCompleted: () => Promise<void>;
  deleteTask: () => Promise<void>;
  duplicateTask: () => Promise<void>;
  copyTasks: () => Promise<void>;
  cutTasks: () => Promise<void>;
  createFromClipboard: () => Promise<void>;
}

export function useTaskActions(params: UseTaskActionsParams): TaskActions {
  const {
    focusedPane, selectedSidebarItem, selectedListId, selectedTask, tasks, flatTasks, selectedTaskIndex, selectedTaskIndices,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash, onCompleteFlash, undoPush,
    isTrashView, onPermanentDeleteRequest, onCascadeComplete, onCascadeDelete, multiSelectClear, showToast,
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

    // Get tasks to toggle (multi-select or single)
    const indicesToToggle = selectedTaskIndices.size > 0 ? [...selectedTaskIndices].sort((a, b) => a - b) : [selectedTaskIndex];
    const tasksToToggle = indicesToToggle.map(i => flatTasks[i]?.task).filter(Boolean);
    if (tasksToToggle.length === 0) return;

    // Single task with descendants - show cascade confirmation
    if (tasksToToggle.length === 1) {
      const task = tasksToToggle[0];
      const descendantIds = getDescendantIds(task.id, tasks);
      if (descendantIds.length > 0 && task.status !== 'COMPLETED') {
        onCascadeComplete?.(task, descendantIds.length, async () => {
          const taskMap = new Map(tasks.map(t => [t.id, t]));
          const idsToComplete = [task.id, ...descendantIds].filter(id => taskMap.get(id)?.status !== 'COMPLETED');
          for (const id of idsToComplete) await window.api.tasksToggleCompleted(id);
          undoPush({
            undo: async () => { for (const id of idsToComplete) await window.api.tasksToggleCompleted(id); },
            redo: async () => { for (const id of idsToComplete) await window.api.tasksToggleCompleted(id); },
          });
          await reloadTasks();
        });
        return;
      }
    }

    // Toggle all selected tasks
    const ids = tasksToToggle.map(t => t.id);
    for (const id of ids) await window.api.tasksToggleCompleted(id);
    undoPush({
      undo: async () => { for (const id of ids) await window.api.tasksToggleCompleted(id); },
      redo: async () => { for (const id of ids) await window.api.tasksToggleCompleted(id); },
    });
    for (const task of tasksToToggle) onCompleteFlash?.(task.id, task.status === 'COMPLETED');
    await reloadTasks();
    multiSelectClear();
  }, [focusedPane, selectedTask, tasks, flatTasks, selectedTaskIndex, selectedTaskIndices, reloadTasks, onCascadeComplete, onCompleteFlash, multiSelectClear, undoPush]);

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

  const copyTasks = useCallback(async () => {
    if (focusedPane !== 'tasks' || !selectedTask) return;
    const indices = selectedTaskIndices.size > 0 ? [...selectedTaskIndices].sort((a, b) => a - b) : [selectedTaskIndex];
    const items = indices.map(i => flatTasks[i]).filter(Boolean);
    if (items.length === 0) return;

    // Find minimum depth to normalize indentation
    const minDepth = Math.min(...items.map(t => t.depth));
    const lines = items.map(t => '  '.repeat(t.depth - minDepth) + '- ' + t.task.title);
    const markdown = lines.join('\n');

    await navigator.clipboard.writeText(markdown);
    showToast(items.length === 1 ? 'Task copied to clipboard' : `${items.length} tasks copied to clipboard`);
  }, [focusedPane, selectedTask, selectedTaskIndex, selectedTaskIndices, flatTasks, showToast]);

  const cutTasks = useCallback(async () => {
    await copyTasks();
    await deleteTask();
  }, [copyTasks, deleteTask]);

  const createFromClipboard = useCallback(async () => {
    if (isTrashView) return;
    const targetListId = selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list.id : null;
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length === 0) return;

      const created: { id: string; title: string; parentId: string | null }[] = [];
      const parentStack: { indent: number; id: string }[] = [];

      for (const line of lines) {
        const match = line.match(/^(\s*)-\s+(.+)$/);
        if (!match) continue;
        const indent = match[1].length;
        const title = match[2];
        const id = crypto.randomUUID();

        while (parentStack.length > 0 && parentStack[parentStack.length - 1].indent >= indent) {
          parentStack.pop();
        }
        const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

        await window.api.tasksCreate(id, targetListId, title);
        if (parentId) await window.api.tasksSetParentId(id, parentId);
        created.push({ id, title, parentId });
        parentStack.push({ indent, id });
      }

      if (created.length > 0) {
        undoPush({
          undo: async () => {
            for (const { id } of created) await window.api.tasksDelete(id);
          },
          redo: async () => {
            for (const { id, title, parentId } of created) {
              await window.api.tasksCreate(id, targetListId, title);
              if (parentId) await window.api.tasksSetParentId(id, parentId);
            }
          },
        });
        await reloadTasks();
        showToast(`Created ${created.length} task${created.length === 1 ? '' : 's'} from clipboard`);
      }
    } catch {
      showToast('Failed to create from clipboard');
    }
  }, [isTrashView, selectedSidebarItem, reloadTasks, showToast, undoPush]);

  return { createTask, toggleTaskCompleted, deleteTask, duplicateTask, copyTasks, cutTasks, createFromClipboard };
}
