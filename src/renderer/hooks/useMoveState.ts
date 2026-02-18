import { useState, useCallback } from 'react';
import type { SidebarItem } from './types';

export interface MoveActions {
  start: () => void;
  cancel: () => void;
  commit: () => Promise<void>;
  handleKeyDown: (e: KeyboardEvent) => boolean;
}

interface UseMoveStateParams {
  sidebarItems: SidebarItem[];
  selectedListId: string | null;
  tasks: { id: string }[];
  selectedTaskIndex: number;
  selectedTaskIndices: Set<number>;
  onCommit: (targetListId: string, taskIds: string[]) => Promise<void>;
}

export function useMoveState({
  sidebarItems,
  selectedListId,
  tasks,
  selectedTaskIndex,
  selectedTaskIndices,
  onCommit,
}: UseMoveStateParams): [{ moveMode: boolean; moveTargetIndex: number }, MoveActions] {
  const [moveMode, setMoveMode] = useState(false);
  const [moveTargetIndex, setMoveTargetIndex] = useState(0);

  const start = useCallback(() => {
    if (tasks[selectedTaskIndex] || selectedTaskIndices.size > 0) {
      setMoveMode(true);
      const listIndex = sidebarItems.findIndex((item) => item.type === 'list');
      setMoveTargetIndex(Math.max(0, listIndex));
    }
  }, [tasks, selectedTaskIndex, selectedTaskIndices.size, sidebarItems]);

  const cancel = useCallback(() => setMoveMode(false), []);

  const commit = useCallback(async () => {
    const targetItem = sidebarItems[moveTargetIndex];
    if (targetItem?.type !== 'list' || targetItem.list.id === selectedListId) {
      setMoveMode(false);
      return;
    }
    const indicesToMove = selectedTaskIndices.size > 0
      ? Array.from(selectedTaskIndices).sort((a, b) => a - b)
      : [selectedTaskIndex];
    const taskIds = indicesToMove.map((idx) => tasks[idx]?.id).filter(Boolean) as string[];
    await onCommit(targetItem.list.id, taskIds);
    setMoveMode(false);
  }, [sidebarItems, moveTargetIndex, selectedListId, selectedTaskIndices, selectedTaskIndex, tasks, onCommit]);

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!moveMode) return false;
    if (e.key === 'Escape') { e.preventDefault(); setMoveMode(false); return true; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? -1 : 1;
      let newIndex = moveTargetIndex + delta;
      while (newIndex >= 0 && newIndex < sidebarItems.length && sidebarItems[newIndex]?.type !== 'list') {
        newIndex += delta;
      }
      if (newIndex >= 0 && newIndex < sidebarItems.length && sidebarItems[newIndex]?.type === 'list') {
        setMoveTargetIndex(newIndex);
      }
      return true;
    }
    if (e.key === 'Enter') { e.preventDefault(); commit(); return true; }
    return true;
  }, [moveMode, moveTargetIndex, sidebarItems, commit]);

  return [{ moveMode, moveTargetIndex }, { start, cancel, commit, handleKeyDown }];
}
