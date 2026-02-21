import { useEffect, useCallback } from 'react';

type Command = () => void;

export interface KeyboardActions {
  openSettings: Command;
  handleSettingsKeyDown: (e: KeyboardEvent) => boolean;
  handleMoveKeyDown: (e: KeyboardEvent) => boolean;
  handleShiftDown: Command;
  handleShiftUp: Command;
  handleCmdDown: Command;
  handleCmdUp: () => number | null;
  cancelEdit: Command;
  clearSelection: Command;
  toggleAtCursor: Command;
  toggleTaskCompleted: Command;
  createList: Command;
  createTask: Command;
  deleteTask: Command;
  switchPane: Command;
  handleArrowNavigation: (e: KeyboardEvent) => void;
  handleHorizontalArrow: (dir: 'left' | 'right') => void;
  startEdit: Command;
  startMove: Command;
  startDueDate: Command;
  commitDueDate: Command;
  undo: Command;
  redo: Command;
  restoreTask: Command;
  openSearch: Command;
}

export interface KeyboardState {
  editMode: unknown;
  dueDateMode: boolean;
  moveMode: boolean;
  focusedPane: 'lists' | 'tasks' | 'detail';
  shiftHeld: boolean;
  cmdHeld: boolean;
  hasSelection: boolean;
  canEdit: boolean;
  isTrashView: boolean;
  hasSelectedTask: boolean;
  isSearchOpen: boolean;
}

export function useKeyboardNavigation(
  actions: KeyboardActions,
  state: KeyboardState,
  setSelectedTaskIndex: (idx: number) => void,
): void {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.metaKey && e.key === ',') { e.preventDefault(); actions.openSettings(); return; }
    if (e.metaKey && e.shiftKey && e.key === 'f') { e.preventDefault(); actions.openSearch(); return; }
    if (state.isSearchOpen) return;
    if (actions.handleSettingsKeyDown(e)) return;
    if (e.key === 'Shift' && state.focusedPane === 'tasks' && !state.editMode && !state.moveMode) {
      if (!state.shiftHeld) actions.handleShiftDown();
      return;
    }
    if (e.key === 'Control' && state.focusedPane === 'tasks' && !state.editMode && !state.moveMode) {
      if (!state.cmdHeld) actions.handleCmdDown();
      return;
    }
    if (state.editMode) {
      if (e.key === 'Escape') { e.preventDefault(); actions.cancelEdit(); }
      if (state.dueDateMode && e.key === 'Enter') { e.preventDefault(); actions.commitDueDate(); }
      return;
    }
    if (e.metaKey && e.shiftKey && e.key === 'z') { e.preventDefault(); actions.redo(); return; }
    if (e.metaKey && e.key === 'z') { e.preventDefault(); actions.undo(); return; }
    if (actions.handleMoveKeyDown(e)) return;
    if (e.key === 'Escape' && state.hasSelection) { e.preventDefault(); actions.clearSelection(); return; }
    if (e.metaKey && e.key === 'Enter' && state.focusedPane === 'tasks') { e.preventDefault(); actions.toggleTaskCompleted(); return; }
    if (state.cmdHeld && e.key === 'Enter' && state.focusedPane === 'tasks') { e.preventDefault(); actions.toggleAtCursor(); return; }
    if (e.key === ' ' && !state.cmdHeld && state.focusedPane === 'tasks') { e.preventDefault(); actions.clearSelection(); return; }
    if (e.metaKey && e.key === 'n') { e.preventDefault(); if (e.shiftKey) actions.createList(); else actions.createTask(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); actions.deleteTask(); return; }
    if (e.key === 'Tab') { e.preventDefault(); if (state.hasSelection) actions.clearSelection(); actions.switchPane(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); actions.handleArrowNavigation(e); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); actions.handleHorizontalArrow(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); if (state.hasSelection || (state.focusedPane === 'lists' && !state.canEdit)) return; actions.startEdit(); return; }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); actions.startMove(); return; }
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); if (!state.hasSelection) actions.startDueDate(); return; }
    if ((e.key === 'r' || e.key === 'R') && state.isTrashView && state.focusedPane === 'tasks') { e.preventDefault(); actions.restoreTask(); return; }
  }, [actions, state]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') { actions.handleShiftUp(); return; }
    if (e.key === 'Control') {
      const cursor = actions.handleCmdUp();
      if (cursor !== null) setSelectedTaskIndex(cursor);
      return;
    }
  }, [actions, setSelectedTaskIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
