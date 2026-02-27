import { useState, useCallback } from 'react';
import type { Task, List, Folder } from '../../shared/types';
import type { SidebarItem, Pane } from '../types';
import { buildSidebarItems } from '../utils/buildSidebarItems';
import type { ConfirmationOption } from '../ConfirmationDialog';

interface ConfirmationDialogState {
  title: string;
  message: string;
  options: ConfirmationOption[];
}

interface UseListActionsParams {
  selectedSidebarItem: SidebarItem | undefined;
  selectedSidebarIndex: number;
  setSelectedSidebarIndex: (index: number) => void;
  setFocusedPane: (pane: Pane) => void;
  setEditMode: (mode: { type: 'list'; id: string } | { type: 'folder'; id: string }) => void;
  setEditValue: (value: string) => void;
  setFolders: (folders: Folder[]) => void;
  setLists: (lists: List[]) => void;
  flash: (id: string) => void;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
  taskCounts: Record<string, number>;
}

export function useListActions({
  selectedSidebarItem, selectedSidebarIndex,
  setSelectedSidebarIndex, setFocusedPane, setEditMode, setEditValue, setFolders, setLists, flash, undoPush, taskCounts,
}: UseListActionsParams): { createList: () => Promise<void>; createFolder: () => Promise<void>; deleteList: () => void; duplicateList: () => Promise<void>; listConfirmationDialog: ConfirmationDialogState | null; closeListConfirmation: () => void } {
  const [listConfirmationDialog, setListConfirmationDialog] = useState<ConfirmationDialogState | null>(null);
  const closeListConfirmation = useCallback(() => setListConfirmationDialog(null), []);
  const createFolder = useCallback(async () => {
    const id = crypto.randomUUID();
    const newFolder = await window.api.foldersCreate(id, '');
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
    const rebuilt = buildSidebarItems(f, l);
    const newIndex = rebuilt.findIndex((item) => item.type === 'folder' && item.folder.id === newFolder.id);
    setSelectedSidebarIndex(newIndex >= 0 ? newIndex : selectedSidebarIndex);
    setFocusedPane('lists');
    setEditMode({ type: 'folder', id: newFolder.id });
    setEditValue('');
    flash(newFolder.id);
    undoPush({
      undo: async () => { await window.api.foldersDelete(newFolder.id); },
      redo: async () => { await window.api.foldersCreate(newFolder.id, ''); },
    });
  }, [selectedSidebarIndex, setSelectedSidebarIndex, setFocusedPane, setEditMode, setEditValue, setFolders, setLists, flash, undoPush]);

  const createList = useCallback(async () => {
    const id = crypto.randomUUID();
    const folderId = selectedSidebarItem?.type === 'folder' ? selectedSidebarItem.folder.id : undefined;
    const newList = await window.api.listsCreate(id, '', folderId);
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
    const rebuilt = buildSidebarItems(f, l);
    const newIndex = rebuilt.findIndex((item) => item.type === 'list' && item.list.id === newList.id);
    setSelectedSidebarIndex(newIndex >= 0 ? newIndex : selectedSidebarIndex);
    setFocusedPane('lists');
    setEditMode({ type: 'list', id: newList.id });
    setEditValue('');
    flash(newList.id);
    undoPush({
      undo: async () => { await window.api.listsDelete(newList.id); },
      redo: async () => { await window.api.listsRestore(newList.id, newList.folder_id, '', newList.sort_key, newList.created_at, newList.updated_at); },
    });
  }, [selectedSidebarItem, selectedSidebarIndex, setSelectedSidebarIndex, setFocusedPane, setEditMode, setEditValue, setFolders, setLists, flash, undoPush]);

  const doDeleteList = useCallback(async (list: List) => {
    await window.api.listsDelete(list.id);
    const trashedTasks = await window.api.tasksGetTrashed();
    const deletedTasks = trashedTasks.filter((t) => t.list_id === list.id);
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
    setSelectedSidebarIndex(Math.max(0, selectedSidebarIndex - 1));
    setListConfirmationDialog(null);
    undoPush({
      undo: async () => {
        await window.api.listsRestore(list.id, list.folder_id, list.name, list.sort_key, list.created_at, list.updated_at);
        for (const t of deletedTasks) {
          await window.api.tasksRestoreFromTrash(t.id);
        }
      },
      redo: async () => { await window.api.listsDelete(list.id); },
    });
  }, [selectedSidebarIndex, setSelectedSidebarIndex, setFolders, setLists, undoPush]);

  const deleteList = useCallback(() => {
    if (selectedSidebarItem?.type !== 'list') return;
    const list = selectedSidebarItem.list;
    const count = taskCounts[list.id] ?? 0;
    setListConfirmationDialog({
      title: 'Confirm list deletion',
      message: `This will also delete the ${count} tasks in this list.`,
      options: [{ label: 'Delete List', action: () => doDeleteList(list), hotkeyDisplay: '⌘ ↵' }],
    });
  }, [selectedSidebarItem, taskCounts, doDeleteList]);

  const duplicateList = useCallback(async () => {
    if (selectedSidebarItem?.type !== 'list') return;
    const src = selectedSidebarItem.list;
    const newId = crypto.randomUUID();
    const newList = await window.api.listsCreate(newId, `${src.name} (copy)`, src.folder_id ?? undefined);
    const srcTasks = await window.api.tasksGetByList(src.id);
    const newTaskIds: string[] = [];
    for (const t of srcTasks) {
      const tid = crypto.randomUUID();
      newTaskIds.push(tid);
      await window.api.tasksCreate(tid, newId, t.title);
      await window.api.tasksSetDueDate(tid, t.due_date);
      await window.api.tasksUpdateNotes(tid, t.notes);
      if (t.status === 'COMPLETED') await window.api.tasksToggleCompleted(tid);
    }
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
    const rebuilt = buildSidebarItems(f, l);
    const newIndex = rebuilt.findIndex((item) => item.type === 'list' && item.list.id === newId);
    setSelectedSidebarIndex(newIndex >= 0 ? newIndex : selectedSidebarIndex);
    flash(newId);
    undoPush({
      undo: async () => {
        for (const tid of newTaskIds) await window.api.tasksDelete(tid);
        await window.api.listsDelete(newId);
      },
      redo: async () => {
        await window.api.listsCreate(newId, `${src.name} (copy)`, src.folder_id ?? undefined);
        for (let i = 0; i < srcTasks.length; i++) {
          const t = srcTasks[i];
          await window.api.tasksCreate(newTaskIds[i], newId, t.title);
          await window.api.tasksSetDueDate(newTaskIds[i], t.due_date);
          await window.api.tasksUpdateNotes(newTaskIds[i], t.notes);
          if (t.status === 'COMPLETED') await window.api.tasksToggleCompleted(newTaskIds[i]);
        }
      },
    });
  }, [selectedSidebarItem, selectedSidebarIndex, setSelectedSidebarIndex, setFolders, setLists, flash, undoPush]);

  return { createList, createFolder, deleteList, duplicateList, listConfirmationDialog, closeListConfirmation };
}

interface UseMoveCommitParams {
  sidebarItems: SidebarItem[];
  tasks: Task[];
  multiSelectActions: { clear: () => void };
  setSelectedSidebarIndex: (index: number) => void;
  setFocusedPane: (pane: Pane) => void;
  reloadData: () => Promise<void>;
  flash: (id: string) => void;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
}

export function useMoveCommit({
  sidebarItems, tasks, multiSelectActions, setSelectedSidebarIndex, setFocusedPane, reloadData, flash, undoPush,
}: UseMoveCommitParams): (targetListId: string, taskIds: string[]) => Promise<void> {
  return useCallback(async (targetListId: string, taskIds: string[]) => {
    const originals = taskIds.map((id) => {
      const t = tasks.find((task) => task.id === id);
      return { id, listId: t?.list_id ?? null, sortKey: t?.sort_key ?? 0 };
    });
    for (const taskId of taskIds) {
      await window.api.tasksMove(taskId, targetListId);
    }
    undoPush({
      undo: async () => {
        for (const orig of originals) {
          if (orig.listId !== null) {
            await window.api.tasksMove(orig.id, orig.listId);
          } else {
            await window.api.tasksSetListId(orig.id, null);
          }
          await window.api.tasksReorder(orig.id, orig.sortKey);
        }
      },
      redo: async () => {
        for (const taskId of taskIds) {
          await window.api.tasksMove(taskId, targetListId);
        }
      },
    });
    multiSelectActions.clear();
    const newIndex = sidebarItems.findIndex((item) => item.type === 'list' && item.list.id === targetListId);
    if (newIndex >= 0) setSelectedSidebarIndex(newIndex);
    setFocusedPane('tasks');
    await reloadData();
    requestAnimationFrame(() => taskIds.forEach(flash));
  }, [sidebarItems, tasks, multiSelectActions, setSelectedSidebarIndex, setFocusedPane, reloadData, flash, undoPush]);
}
