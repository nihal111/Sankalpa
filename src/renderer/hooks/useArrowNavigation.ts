import { useCallback } from 'react';
import type { Pane } from '../types';
import type { MultiSelectActions } from '../useMultiSelect';
import type { SidebarItem } from '../utils/buildSidebarItems';

interface UseArrowNavigationParams {
  focusedPane: Pane;
  sidebarItems: SidebarItem[];
  taskCounts: Record<string, number>;
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

function isItemHidden(item: SidebarItem, taskCounts: Record<string, number>): boolean {
  if (item.type !== 'smart') return false;
  if (item.smartList.id !== 'overdue') return false;
  return (taskCounts['overdue'] ?? 0) === 0;
}

export function useArrowNavigation(params: UseArrowNavigationParams): (e: KeyboardEvent) => void {
  const {
    focusedPane, sidebarItems, taskCounts, tasksLength, selectedTaskIndex, selectionAnchor,
    boundaryCursor, shiftHeld, cmdHeld, selectedTaskIndicesSize,
    setSelectedSidebarIndex, setSelectedTaskIndex, multiSelectActions, handleReorder,
  } = params;

  return useCallback((e: KeyboardEvent) => {
    const delta = e.key === 'ArrowUp' ? -1 : 1;
    if (e.altKey && !e.metaKey && !e.shiftKey && focusedPane === 'tasks') {
      if (selectedTaskIndicesSize > 0) multiSelectActions.clear();
      handleReorder(delta);
      return;
    }
    if (focusedPane === 'lists') {
      setSelectedSidebarIndex((i) => {
        let next = i + delta;
        while (next >= 0 && next < sidebarItems.length && isItemHidden(sidebarItems[next], taskCounts)) {
          next += delta;
        }
        if (next < 0 || next >= sidebarItems.length) return i; // Stay put if no visible item found
        return next;
      });
      return;
    }
    // Cmd+Shift+Arrow: select from cursor to top/bottom
    if (e.metaKey && e.shiftKey) {
      const targetIndex = delta === -1 ? 0 : tasksLength - 1;
      const anchor = selectionAnchor ?? selectedTaskIndex;
      setSelectedTaskIndex(targetIndex);
      multiSelectActions.extendSelection(anchor, targetIndex);
      return;
    }
    // Cmd+Arrow: jump to top/bottom
    if (e.metaKey) {
      if (selectedTaskIndicesSize > 0) multiSelectActions.clear();
      setSelectedTaskIndex(delta === -1 ? 0 : tasksLength - 1);
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
  }, [focusedPane, sidebarItems, taskCounts, tasksLength, selectedTaskIndex, selectionAnchor, shiftHeld, cmdHeld, selectedTaskIndicesSize, handleReorder, multiSelectActions, boundaryCursor, setSelectedSidebarIndex, setSelectedTaskIndex]);
}
