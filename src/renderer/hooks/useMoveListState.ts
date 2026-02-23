import { useState, useCallback, useMemo } from 'react';
import type { Folder } from '../../shared/types';
import type { SidebarItem } from '../types';

interface MoveListTarget {
  label: string;
  folderId: string | null;
}

interface UseMoveListStateParams {
  folders: Folder[];
  selectedSidebarItem: SidebarItem | undefined;
  sidebarItems: SidebarItem[];
  selectedSidebarIndex: number;
  sidebarItemsLength: number;
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
}

export function useMoveListState({ folders, selectedSidebarItem, sidebarItems, selectedSidebarIndex, sidebarItemsLength, setSelectedSidebarIndex, reloadData, undoPush }: UseMoveListStateParams): MoveListState {
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

  const cycleSidebarNext = useCallback(() => {
    setSelectedSidebarIndex((i: number) => (i + 1) % sidebarItemsLength);
  }, [sidebarItemsLength, setSelectedSidebarIndex]);
  const cycleSidebarPrev = useCallback(() => {
    setSelectedSidebarIndex((i: number) => (i - 1 + sidebarItemsLength) % sidebarItemsLength);
  }, [sidebarItemsLength, setSelectedSidebarIndex]);

  const selectSidebarByListNumber = useCallback((n: number) => {
    let count = 0;
    for (let i = 0; i < sidebarItems.length; i++) {
      if (sidebarItems[i].type === 'list') { count++; if (count === n) { setSelectedSidebarIndex(() => i); return; } }
    }
  }, [sidebarItems, setSelectedSidebarIndex]);

  return { moveListMode, getMoveListTargetName, moveListTargets: targets, moveListTargetIndex: targetIdx, startMoveList, handleMoveListKeyDown, indentList, outdentList, cycleSidebarNext, cycleSidebarPrev, selectSidebarByListNumber };
}

function useCycleSidebar(length: number, setter: (fn: (i: number) => number) => void): { next: () => void; prev: () => void } {
  const next = useCallback(() => setter((i: number) => (i + 1) % length), [length, setter]);
  const prev = useCallback(() => setter((i: number) => (i - 1 + length) % length), [length, setter]);
  return { next, prev };
}
