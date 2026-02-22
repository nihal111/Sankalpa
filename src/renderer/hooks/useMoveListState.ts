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
  reloadData: () => Promise<void>;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
}

interface MoveListState {
  moveListMode: boolean;
  getMoveListTargetName: () => string;
  startMoveList: () => void;
  handleMoveListKeyDown: (e: KeyboardEvent) => boolean;
}

export function useMoveListState({ folders, selectedSidebarItem, reloadData, undoPush }: UseMoveListStateParams): MoveListState {
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

  return { moveListMode, getMoveListTargetName, startMoveList, handleMoveListKeyDown };
}
