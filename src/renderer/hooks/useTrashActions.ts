import { useCallback, useState, useMemo } from 'react';
import type { Task, List } from '../../shared/types';
import type { ConfirmationOption } from '../ConfirmationDialog';
import type { SidebarItem } from '../types';

interface ConfirmationDialogState {
  title: string;
  message: string;
  options: ConfirmationOption[];
}

interface UseTrashActionsParams {
  selectedSidebarItem: SidebarItem | undefined;
  tasks: Task[];
  selectedTaskIndex: number;
  lists: List[];
  setSelectedTaskIndex: (fn: (i: number) => number) => void;
  reloadTasks: () => Promise<void>;
  reloadData: () => Promise<void>;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
}

export function useTrashActions({
  selectedSidebarItem, tasks, selectedTaskIndex, lists,
  setSelectedTaskIndex, reloadTasks, reloadData, undoPush,
}: UseTrashActionsParams): [
  ConfirmationDialogState | null,
  { handlePermanentDeleteRequest: (task: Task) => void; handleRestoreTask: () => Promise<void>; closeConfirmationDialog: () => void }
] {
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState | null>(null);

  const isTrashView = useMemo(() =>
    selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'trash',
  [selectedSidebarItem]);

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

  const handlePermanentDeleteRequest = useCallback((task: Task) => {
    setConfirmationDialog({
      title: 'Permanently Delete',
      message: `Are you sure you want to permanently delete "${task.title || 'Untitled'}"? This cannot be undone.`,
      options: [{ label: 'Delete', action: () => handlePermanentDelete(task) }],
    });
  }, [handlePermanentDelete]);

  const handleRestoreTask = useCallback(async () => {
    if (!isTrashView || tasks.length === 0) return;
    const task = tasks[selectedTaskIndex];
    if (!task) return;

    const listExists = task.list_id === null || lists.some((l) => l.id === task.list_id);

    if (listExists) {
      await window.api.tasksRestoreFromTrash(task.id);
      await reloadTasks();
      setSelectedTaskIndex((i: number) => Math.min(i, tasks.length - 2));
      undoPush({
        undo: async () => { await window.api.tasksSoftDelete(task.id); },
        redo: async () => { await window.api.tasksRestoreFromTrash(task.id); },
      });
    } else {
      const listName = task.list_id ?? 'Unknown';
      setConfirmationDialog({
        title: 'Restore Task',
        message: `The original list no longer exists.`,
        options: [
          {
            label: 'Restore to Inbox',
            action: async () => {
              await window.api.tasksSetListId(task.id, null);
              await window.api.tasksRestoreFromTrash(task.id);
              await reloadTasks();
              setSelectedTaskIndex((i: number) => Math.min(i, tasks.length - 2));
              setConfirmationDialog(null);
            },
          },
          {
            label: `Create "${listName}" and restore`,
            action: async () => {
              const newList = await window.api.listsCreate(crypto.randomUUID(), listName);
              await window.api.tasksSetListId(task.id, newList.id);
              await window.api.tasksRestoreFromTrash(task.id);
              await reloadData();
              await reloadTasks();
              setSelectedTaskIndex((i: number) => Math.min(i, tasks.length - 2));
              setConfirmationDialog(null);
            },
          },
        ],
      });
    }
  }, [isTrashView, tasks, selectedTaskIndex, lists, reloadTasks, reloadData, setSelectedTaskIndex, undoPush]);

  const closeConfirmationDialog = useCallback(() => setConfirmationDialog(null), []);

  return [confirmationDialog, { handlePermanentDeleteRequest, handleRestoreTask, closeConfirmationDialog }];
}
