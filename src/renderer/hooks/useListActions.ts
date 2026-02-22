import { useCallback } from 'react';
import type { Task, List, Folder } from '../../shared/types';
import type { SidebarItem, Pane } from '../types';
import { buildSidebarItems } from '../utils/buildSidebarItems';

interface UseListActionsParams {
  selectedSidebarItem: SidebarItem | undefined;
  selectedSidebarIndex: number;
  setSelectedSidebarIndex: (index: number) => void;
  setFocusedPane: (pane: Pane) => void;
  setEditMode: (mode: { type: 'list'; id: string }) => void;
  setEditValue: (value: string) => void;
  setFolders: (folders: Folder[]) => void;
  setLists: (lists: List[]) => void;
  flash: (id: string) => void;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
}

export function useListActions({
  selectedSidebarItem, selectedSidebarIndex,
  setSelectedSidebarIndex, setFocusedPane, setEditMode, setEditValue, setFolders, setLists, flash, undoPush,
}: UseListActionsParams): { createList: () => Promise<void>; deleteList: () => Promise<void> } {
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

  const deleteList = useCallback(async () => {
    if (selectedSidebarItem?.type !== 'list') return;
    const list = selectedSidebarItem.list;
    const tasks = await window.api.tasksGetByList(list.id);
    await window.api.listsDelete(list.id);
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
    setSelectedSidebarIndex(Math.max(0, selectedSidebarIndex - 1));
    undoPush({
      undo: async () => {
        await window.api.listsRestore(list.id, list.folder_id, list.name, list.sort_key, list.created_at, list.updated_at);
        for (const t of tasks) {
          await window.api.tasksRestore(t.id, t.list_id, t.title, t.status, t.created_timestamp, t.completed_timestamp, t.sort_key, t.created_at, t.updated_at);
        }
      },
      redo: async () => { await window.api.listsDelete(list.id); },
    });
  }, [selectedSidebarItem, selectedSidebarIndex, setSelectedSidebarIndex, setFolders, setLists, undoPush]);

  return { createList, deleteList };
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
    taskIds.forEach(flash);
    multiSelectActions.clear();
    const newIndex = sidebarItems.findIndex((item) => item.type === 'list' && item.list.id === targetListId);
    if (newIndex >= 0) setSelectedSidebarIndex(newIndex);
    setFocusedPane('lists');
    await reloadData();
  }, [sidebarItems, tasks, multiSelectActions, setSelectedSidebarIndex, setFocusedPane, reloadData, flash, undoPush]);
}
