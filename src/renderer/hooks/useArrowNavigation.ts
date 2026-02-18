import { useCallback } from 'react';
import type { Pane } from '../types';
import type { MultiSelectActions } from '../useMultiSelect';

interface UseArrowNavigationParams {
  focusedPane: Pane;
  sidebarItemsLength: number;
  tasksLength: number;
  selectedTaskIndex: number;
  selectionAnchor: number | null;
  boundaryCursor: number | null;
  shiftHeld: boolean;
  cmdHeld: boolean;
  selectedTaskIndicesSize: number;
  setSelectedSidebarIndex: (fn: (i: number) => number) => void;
  setSelectedTaskIndex: (fn: number | ((i: number) => number)) => void;
  multiSelectActions: MultiSelectActions;
  handleReorder: (direction: -1 | 1) => Promise<void>;
}

export function useArrowNavigation(params: UseArrowNavigationParams): (e: KeyboardEvent) => void {
  const {
    focusedPane, sidebarItemsLength, tasksLength, selectedTaskIndex, selectionAnchor,
    boundaryCursor, shiftHeld, cmdHeld, selectedTaskIndicesSize,
    setSelectedSidebarIndex, setSelectedTaskIndex, multiSelectActions, handleReorder,
  } = params;

  return useCallback((e: KeyboardEvent) => {
    const delta = e.key === 'ArrowUp' ? -1 : 1;
    if (e.metaKey && e.shiftKey && focusedPane === 'tasks') {
      if (selectedTaskIndicesSize > 0) multiSelectActions.clear();
      handleReorder(delta);
      return;
    }
    if (focusedPane === 'lists') {
      setSelectedSidebarIndex((i) => Math.max(0, Math.min(sidebarItemsLength - 1, i + delta)));
      return;
    }
    if (cmdHeld) {
      multiSelectActions.moveBoundaryCursor(Math.max(0, Math.min(tasksLength - 1, (boundaryCursor ?? selectedTaskIndex) + delta)));
      return;
    }
    if (shiftHeld && selectionAnchor !== null) {
      const newIndex = Math.max(0, Math.min(tasksLength - 1, selectedTaskIndex + delta));
      setSelectedTaskIndex(newIndex);
      multiSelectActions.extendSelection(selectionAnchor, newIndex);
      return;
    }
    if (selectedTaskIndicesSize > 0) multiSelectActions.clear();
    setSelectedTaskIndex((i: number) => Math.max(0, Math.min(tasksLength - 1, i + delta)));
  }, [focusedPane, sidebarItemsLength, tasksLength, selectedTaskIndex, selectionAnchor, shiftHeld, cmdHeld, selectedTaskIndicesSize, handleReorder, multiSelectActions, boundaryCursor, setSelectedSidebarIndex, setSelectedTaskIndex]);
}
