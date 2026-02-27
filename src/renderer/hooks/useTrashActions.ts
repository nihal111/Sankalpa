import { useState, useCallback } from 'react';
import type { Task, List } from '../../shared/types';
import type { UndoEntry } from './useUndoStack';
import type { ConfirmationOption } from '../ConfirmationDialog';

interface ConfirmationDialogState {
  title: string;
  message: string;
  options: ConfirmationOption[];
}

interface UseTrashActionsParams {
  isTrashView: boolean;
  tasks: Task[];
  lists: List[];
  selectedTaskIndex: number;
  selectedTaskIndices: Set<number>;
  setSelectedTaskIndex: (fn: number | ((i: number) => number)) => void;
  multiSelectClear: () => void;
  reloadTasks: () => Promise<void>;
  undoPush: (entry: UndoEntry) => void;
}

interface TrashActions {
  confirmationDialog: ConfirmationDialogState | null;
  closeConfirmationDialog: () => void;
  handlePermanentDeleteRequest: (task: Task) => void;
  handleRestoreTask: () => Promise<void>;
  handleCascadeComplete: (task: Task, descendantCount: number, onConfirm: () => void) => void;
  handleCascadeDelete: (task: Task, descendantCount: number, onConfirm: () => void) => void;
}

export function useTrashActions(params: UseTrashActionsParams): TrashActions {
  const { isTrashView, tasks, lists, selectedTaskIndex, selectedTaskIndices, setSelectedTaskIndex, multiSelectClear, reloadTasks, undoPush } = params;
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState | null>(null);

  const closeConfirmationDialog = useCallback(() => setConfirmationDialog(null), []);

  const handlePermanentDelete = useCallback(async (task: Task) => {
    const { id, list_id, title, status, created_timestamp, completed_timestamp, sort_key, created_at, updated_at, deleted_at } = task;
    await window.api.tasksDelete(id);
    await reloadTasks();
    setSelectedTaskIndex((i: number) => Math.min(i, tasks.length - 2));
    setConfirmationDialog(null);
    undoPush({
      undo: async () => { await window.api.tasksRestore(id, list_id, title, status, created_timestamp, completed_timestamp, sort_key, created_at, updated_at, deleted_at); },
      redo: async () => { await window.api.tasksDelete(id); },
    });
  }, [reloadTasks, setSelectedTaskIndex, tasks.length, undoPush]);

  const handlePermanentDeleteMulti = useCallback(async (tasksToDelete: Task[], firstIndex: number) => {
    for (const t of tasksToDelete) await window.api.tasksDelete(t.id);
    await reloadTasks();
    multiSelectClear();
    setSelectedTaskIndex(Math.min(firstIndex, tasks.length - tasksToDelete.length - 1));
    setConfirmationDialog(null);
    undoPush({
      undo: async () => { for (const t of tasksToDelete) await window.api.tasksRestore(t.id, t.list_id, t.title, t.status, t.created_timestamp, t.completed_timestamp, t.sort_key, t.created_at, t.updated_at, t.deleted_at); },
      redo: async () => { for (const t of tasksToDelete) await window.api.tasksDelete(t.id); },
    });
  }, [reloadTasks, multiSelectClear, setSelectedTaskIndex, tasks.length, undoPush]);

  const handlePermanentDeleteRequest = useCallback((task: Task) => {
    const indicesToDelete = selectedTaskIndices.size > 0 ? [...selectedTaskIndices].sort((a, b) => a - b) : [tasks.indexOf(task)];
    const tasksToDelete = indicesToDelete.map(i => tasks[i]).filter(Boolean);
    if (tasksToDelete.length === 0) return;
    const firstIndex = indicesToDelete[0];

    if (tasksToDelete.length === 1) {
      setConfirmationDialog({
        title: 'Permanently Delete',
        message: `Are you sure you want to permanently delete "${tasksToDelete[0].title || 'Untitled'}"? This cannot be undone.`,
        options: [{ label: 'Delete', action: () => handlePermanentDelete(tasksToDelete[0]), hotkeyDisplay: '⌘ ↵' }],
      });
    } else {
      setConfirmationDialog({
        title: 'Permanently Delete',
        message: `Are you sure you want to permanently delete ${tasksToDelete.length} selected tasks? This cannot be undone.`,
        options: [{ label: 'Delete All', action: () => handlePermanentDeleteMulti(tasksToDelete, firstIndex), hotkeyDisplay: '⌘ ↵' }],
      });
    }
  }, [handlePermanentDelete, handlePermanentDeleteMulti, selectedTaskIndices, tasks]);

  const handleRestoreTask = useCallback(async () => {
    if (!isTrashView || tasks.length === 0) return;

    // Get tasks to restore (multi-select or single)
    const indicesToRestore = selectedTaskIndices.size > 0 ? [...selectedTaskIndices].sort((a, b) => a - b) : [selectedTaskIndex];
    const tasksToRestore = indicesToRestore.map(i => tasks[i]).filter(Boolean);
    if (tasksToRestore.length === 0) return;

    // Find all descendants of selected tasks that are also in trash
    const selectedIds = new Set(tasksToRestore.map(t => t.id));
    const descendantsToRestore: Task[] = [];
    let foundMore = true;
    while (foundMore) {
      foundMore = false;
      for (const t of tasks) {
        if (t.parent_id && (selectedIds.has(t.parent_id) || descendantsToRestore.some(d => d.id === t.parent_id)) && !selectedIds.has(t.id) && !descendantsToRestore.some(d => d.id === t.id)) {
          descendantsToRestore.push(t);
          foundMore = true;
        }
      }
    }
    // Restore parents first, then descendants (in order found, which preserves hierarchy)
    const allTasksToRestore = [...tasksToRestore, ...descendantsToRestore];

    // Check if any task's list is missing
    const missingListTasks = tasksToRestore.filter(t => t.list_id !== null && !lists.some(l => l.id === t.list_id));

    if (missingListTasks.length > 0) {
      // For simplicity, if any list is missing, offer to restore all to inbox
      setConfirmationDialog({
        title: 'Restore Task' + (tasksToRestore.length > 1 ? 's' : ''),
        message: tasksToRestore.length === 1
          ? `The original list no longer exists.`
          : `Some original lists no longer exist.`,
        options: [{
          label: 'Restore to Inbox',
          hotkeyDisplay: '⌘ ↵',
          action: async () => {
            for (const t of allTasksToRestore) {
              if (missingListTasks.some(m => m.id === t.id)) await window.api.tasksSetListId(t.id, null);
              await window.api.tasksRestoreFromTrash(t.id);
            }
            await reloadTasks();
            multiSelectClear();
            setSelectedTaskIndex(Math.min(indicesToRestore[0], tasks.length - allTasksToRestore.length - 1));
            setConfirmationDialog(null);
          },
        }],
      });
      return;
    }

    // All lists exist, restore directly
    for (const t of allTasksToRestore) await window.api.tasksRestoreFromTrash(t.id);
    await reloadTasks();
    multiSelectClear();
    setSelectedTaskIndex(Math.min(indicesToRestore[0], tasks.length - allTasksToRestore.length - 1));
    undoPush({
      undo: async () => { for (const t of allTasksToRestore) await window.api.tasksSoftDelete(t.id); },
      redo: async () => { for (const t of allTasksToRestore) await window.api.tasksRestoreFromTrash(t.id); },
    });
  }, [isTrashView, tasks, selectedTaskIndex, selectedTaskIndices, lists, reloadTasks, multiSelectClear, setSelectedTaskIndex, undoPush]);

  const handleCascadeComplete = useCallback((task: Task, descendantCount: number, onConfirm: () => void) => {
    setConfirmationDialog({
      title: 'Complete Task',
      message: `Completing this task will also complete ${descendantCount} subtask${descendantCount === 1 ? '' : 's'}. Continue?`,
      options: [{ label: 'Complete All', action: () => { setConfirmationDialog(null); onConfirm(); }, hotkeyDisplay: '⌘ ↵' }],
    });
  }, []);

  const handleCascadeDelete = useCallback((task: Task, descendantCount: number, onConfirm: () => void) => {
    setConfirmationDialog({
      title: 'Delete Task',
      message: `Deleting this task will also delete ${descendantCount} subtask${descendantCount === 1 ? '' : 's'}. Continue?`,
      options: [{ label: 'Delete All', action: () => { setConfirmationDialog(null); onConfirm(); }, hotkeyDisplay: '⌘ ↵' }],
    });
  }, []);

  return {
    confirmationDialog,
    closeConfirmationDialog,
    handlePermanentDeleteRequest,
    handleRestoreTask,
    handleCascadeComplete,
    handleCascadeDelete,
  };
}
