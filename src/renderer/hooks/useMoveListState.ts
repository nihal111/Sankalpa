import { useState, useCallback, useMemo } from 'react';
import type { Folder, List } from '../../shared/types';
import type { SidebarItem } from '../types';
import { SMART_LISTS } from '../types';

interface MoveListTarget {
  label: string;
  folderId: string | null;
}

interface UseMoveListStateParams {
  folders: Folder[];
  lists: List[];
  selectedSidebarItem: SidebarItem | undefined;
  sidebarItems: SidebarItem[];
  selectedSidebarIndex: number;
  sidebarItemsLength: number;
  taskCounts: Record<string, number>;
  setSelectedSidebarIndex: (fn: (i: number) => number) => void;
  reloadData: () => Promise<void>;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
}

interface MoveListState {
  moveListMode: boolean;
  getMoveListTargetName: () => string;
  moveListTargets: { label: string; folderId: string | null }[];
  moveListTargetIndex: number;
  startMoveList: () => void;
  handleMoveListKeyDown: (e: KeyboardEvent) => boolean;
  indentList: () => Promise<void>;
  outdentList: () => Promise<void>;
  cycleSidebarNext: () => void;
  cycleSidebarPrev: () => void;
  selectSidebarByListNumber: (n: number) => void;
  reorderListUp: () => Promise<void>;
  reorderListDown: () => Promise<void>;
}

export function useMoveListState({ folders, lists, selectedSidebarItem, sidebarItems, selectedSidebarIndex, sidebarItemsLength, taskCounts, setSelectedSidebarIndex, reloadData, undoPush }: UseMoveListStateParams): MoveListState {
  const [moveListMode, setMoveListMode] = useState(false);
  const [targetIdx, setTargetIdx] = useState(0);

  const targets = useMemo((): MoveListTarget[] => {
    const t: MoveListTarget[] = [{ label: 'No folder', folderId: null }];
    for (const f of folders) t.push({ label: f.name, folderId: f.id });
    return t;
  }, [folders]);

  const startMoveList = useCallback(() => {
    if (selectedSidebarItem?.type !== 'list') return;
    setMoveListMode(true);
    const idx = targets.findIndex(t => t.folderId === selectedSidebarItem.list.folder_id);
    setTargetIdx(Math.max(0, idx));
  }, [selectedSidebarItem, targets]);

  const handleMoveListKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!moveListMode) return false;
    if (e.key === 'Escape') { e.preventDefault(); setMoveListMode(false); return true; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setTargetIdx(i => {
        const next = i + (e.key === 'ArrowUp' ? -1 : 1);
        return Math.max(0, Math.min(targets.length - 1, next));
      });
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSidebarItem?.type === 'list') {
        const target = targets[targetIdx];
        const list = selectedSidebarItem.list;
        const oldFolderId = list.folder_id;
        window.api.listsMove(list.id, target.folderId).then(() => reloadData());
        undoPush({
          undo: async () => { await window.api.listsMove(list.id, oldFolderId); },
          redo: async () => { await window.api.listsMove(list.id, target.folderId); },
        });
      }
      setMoveListMode(false);
      return true;
    }
    return true;
  }, [moveListMode, targets, targetIdx, selectedSidebarItem, reloadData, undoPush]);

  const getMoveListTargetName = useCallback((): string => moveListMode ? targets[targetIdx]?.label ?? '' : '', [moveListMode, targets, targetIdx]);

  const indentList = useCallback(async () => {
    if (selectedSidebarItem?.type !== 'list') return;
    const list = selectedSidebarItem.list;
    const prevItems = sidebarItems.slice(0, selectedSidebarIndex);
    const folderAbove = [...prevItems].reverse().find(i => i.type === 'folder');
    if (!folderAbove || folderAbove.type !== 'folder') return;
    const oldFolderId = list.folder_id;
    await window.api.listsMove(list.id, folderAbove.folder.id);
    await reloadData();
    undoPush({
      undo: async () => { await window.api.listsMove(list.id, oldFolderId); },
      redo: async () => { await window.api.listsMove(list.id, folderAbove.folder.id); },
    });
  }, [selectedSidebarItem, sidebarItems, selectedSidebarIndex, reloadData, undoPush]);

  const outdentList = useCallback(async () => {
    if (selectedSidebarItem?.type !== 'list' || !selectedSidebarItem.list.folder_id) return;
    const list = selectedSidebarItem.list;
    const oldFolderId = list.folder_id;
    await window.api.listsMove(list.id, null);
    await reloadData();
    undoPush({
      undo: async () => { await window.api.listsMove(list.id, oldFolderId); },
      redo: async () => { await window.api.listsMove(list.id, null); },
    });
  }, [selectedSidebarItem, reloadData, undoPush]);

  const isHidden = useCallback((item: SidebarItem): boolean => {
    return item.type === 'smart' && item.smartList.id === 'overdue' && (taskCounts['overdue'] ?? 0) === 0;
  }, [taskCounts]);

  const cycleSidebarNext = useCallback(() => {
    setSelectedSidebarIndex((i: number) => {
      let next = (i + 1) % sidebarItemsLength;
      while (isHidden(sidebarItems[next]) && next !== i) next = (next + 1) % sidebarItemsLength;
      return next;
    });
  }, [sidebarItemsLength, sidebarItems, isHidden, setSelectedSidebarIndex]);
  const cycleSidebarPrev = useCallback(() => {
    setSelectedSidebarIndex((i: number) => {
      let next = (i - 1 + sidebarItemsLength) % sidebarItemsLength;
      while (isHidden(sidebarItems[next]) && next !== i) next = (next - 1 + sidebarItemsLength) % sidebarItemsLength;
      return next;
    });
  }, [sidebarItemsLength, sidebarItems, isHidden, setSelectedSidebarIndex]);

  const selectSidebarByListNumber = useCallback((n: number) => {
    if (n === 0) {
      const inboxIndex = sidebarItems.findIndex((item) => item.type === 'smart' && item.smartList.id === 'inbox');
      if (inboxIndex >= 0) setSelectedSidebarIndex(() => inboxIndex);
      return;
    }
    let count = 0;
    for (let i = 0; i < sidebarItems.length; i++) {
      if (sidebarItems[i].type === 'list') { count++; if (count === n) { setSelectedSidebarIndex(() => i); return; } }
    }
  }, [sidebarItems, setSelectedSidebarIndex]);

  const reorderList = useCallback(async (direction: -1 | 1) => {
    if (selectedSidebarItem?.type !== 'list' && selectedSidebarItem?.type !== 'folder') return;
    const smartCount = SMART_LISTS.length;
    const reorderableItems = sidebarItems.slice(smartCount, -1); // exclude smart lists and trash
    const currentIdx = selectedSidebarIndex - smartCount;
    if (currentIdx < 0 || currentIdx >= reorderableItems.length) return;

    const current = reorderableItems[currentIdx];
    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= reorderableItems.length) return;
    const target = reorderableItems[targetIdx];

    // Helper to find lists in a folder
    const listsInFolder = (folderId: string) => lists.filter(l => l.folder_id === folderId);

    if (current.type === 'list') {
      const list = current.list;
      const oldFolderId = list.folder_id;
      const oldSortKey = list.sort_key;

      if (direction === -1) {
        // Moving up
        if (target.type === 'folder') {
          // Move into folder as last item
          const folderLists = listsInFolder(target.folder.id);
          const maxKey = folderLists.length > 0 ? Math.max(...folderLists.map(l => l.sort_key)) : 0;
          await window.api.listsMove(list.id, target.folder.id);
          await window.api.listsReorder(list.id, maxKey + 1);
          undoPush({
            undo: async () => { await window.api.listsMove(list.id, oldFolderId); await window.api.listsReorder(list.id, oldSortKey); },
            redo: async () => { await window.api.listsMove(list.id, target.folder.id); await window.api.listsReorder(list.id, maxKey + 1); },
          });
          await reloadData();
          setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
        } else if (target.type === 'list' && target.list.folder_id === oldFolderId) {
          // Same folder/level - swap
          const newKey = target.list.sort_key;
          await window.api.listsReorder(list.id, newKey);
          await window.api.listsReorder(target.list.id, oldSortKey);
          undoPush({
            undo: async () => { await window.api.listsReorder(list.id, oldSortKey); await window.api.listsReorder(target.list.id, newKey); },
            redo: async () => { await window.api.listsReorder(list.id, newKey); await window.api.listsReorder(target.list.id, oldSortKey); },
          });
          await reloadData();
          setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
        } else if (target.type === 'list' && target.list.folder_id && !oldFolderId) {
          // Top-level list moving into a folder (target is inside a folder)
          // Move into folder ABOVE target (lower sort_key)
          const targetFolderId = target.list.folder_id;
          const newKey = target.list.sort_key - 1;
          await window.api.listsMove(list.id, targetFolderId);
          await window.api.listsReorder(list.id, newKey);
          undoPush({
            undo: async () => { await window.api.listsMove(list.id, null); await window.api.listsReorder(list.id, oldSortKey); },
            redo: async () => { await window.api.listsMove(list.id, targetFolderId); await window.api.listsReorder(list.id, newKey); },
          });
          await reloadData();
          setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
        } else if (oldFolderId && target.type === 'list' && target.list.folder_id !== oldFolderId) {
          // Moving out of folder (target is in different folder or top-level)
          await window.api.listsMove(list.id, null);
          await window.api.listsReorder(list.id, target.list.sort_key);
          await window.api.listsReorder(target.list.id, oldSortKey);
          undoPush({
            undo: async () => { await window.api.listsMove(list.id, oldFolderId); await window.api.listsReorder(list.id, oldSortKey); },
            redo: async () => { await window.api.listsMove(list.id, null); },
          });
          await reloadData();
          setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
        }
      } else {
        // Moving down
        if (oldFolderId) {
          // In a folder - check if at end of folder
          const folderLists = listsInFolder(oldFolderId);
          const isLastInFolder = folderLists.every(l => l.sort_key <= list.sort_key);
          if (isLastInFolder && (target.type === 'folder' || (target.type === 'list' && target.list.folder_id !== oldFolderId))) {
            // Move out of folder
            const topLevelLists = lists.filter(l => l.folder_id === null);
            const minKey = topLevelLists.length > 0 ? Math.min(...topLevelLists.map(l => l.sort_key)) : 1;
            await window.api.listsMove(list.id, null);
            await window.api.listsReorder(list.id, minKey - 1);
            undoPush({
              undo: async () => { await window.api.listsMove(list.id, oldFolderId); await window.api.listsReorder(list.id, oldSortKey); },
              redo: async () => { await window.api.listsMove(list.id, null); await window.api.listsReorder(list.id, minKey - 1); },
            });
            await reloadData();
            setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
            return;
          }
        }
        if (target.type === 'folder' && target.folder.is_expanded) {
          // Move into expanded folder as first item
          const folderLists = listsInFolder(target.folder.id);
          const minKey = folderLists.length > 0 ? Math.min(...folderLists.map(l => l.sort_key)) : 1;
          await window.api.listsMove(list.id, target.folder.id);
          await window.api.listsReorder(list.id, minKey - 1);
          undoPush({
            undo: async () => { await window.api.listsMove(list.id, oldFolderId); await window.api.listsReorder(list.id, oldSortKey); },
            redo: async () => { await window.api.listsMove(list.id, target.folder.id); await window.api.listsReorder(list.id, minKey - 1); },
          });
          await reloadData();
          setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
        } else if (target.type === 'list' && target.list.folder_id === oldFolderId) {
          // Same folder/level - swap
          const newKey = target.list.sort_key;
          await window.api.listsReorder(list.id, newKey);
          await window.api.listsReorder(target.list.id, oldSortKey);
          undoPush({
            undo: async () => { await window.api.listsReorder(list.id, oldSortKey); await window.api.listsReorder(target.list.id, newKey); },
            redo: async () => { await window.api.listsReorder(list.id, newKey); await window.api.listsReorder(target.list.id, oldSortKey); },
          });
          await reloadData();
          setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
        }
      }
    } else if (current.type === 'folder' && target.type === 'folder') {
      // Folders only swap with other folders
      const oldKey = current.folder.sort_key;
      const newKey = target.folder.sort_key;
      await window.api.foldersReorder(current.folder.id, newKey);
      await window.api.foldersReorder(target.folder.id, oldKey);
      undoPush({
        undo: async () => { await window.api.foldersReorder(current.folder.id, oldKey); await window.api.foldersReorder(target.folder.id, newKey); },
        redo: async () => { await window.api.foldersReorder(current.folder.id, newKey); await window.api.foldersReorder(target.folder.id, oldKey); },
      });
      await reloadData();
      setSelectedSidebarIndex(() => selectedSidebarIndex + direction);
    }
  }, [selectedSidebarItem, sidebarItems, selectedSidebarIndex, lists, reloadData, undoPush, setSelectedSidebarIndex]);

  const reorderListUp = useCallback(() => reorderList(-1), [reorderList]);
  const reorderListDown = useCallback(() => reorderList(1), [reorderList]);

  return { moveListMode, getMoveListTargetName, moveListTargets: targets, moveListTargetIndex: targetIdx, startMoveList, handleMoveListKeyDown, indentList, outdentList, cycleSidebarNext, cycleSidebarPrev, selectSidebarByListNumber, reorderListUp, reorderListDown };
}
