import { useEffect, useCallback } from 'react';
import { actions as registeredActions, matchesHotkey, ActionContext, Action } from '../actionRegistry';

type Command = () => void;

const actionMap = new Map<string, Action>(registeredActions.map(a => [a.id, a]));

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
  deleteList: Command;
  handleArrowNavigation: (e: KeyboardEvent) => void;
  handleHorizontalArrow: (dir: 'left' | 'right') => void;
  startEdit: Command;
  startMove: Command;
  startDueDate: Command;
  undo: Command;
  redo: Command;
  restoreTask: Command;
  openSearch: Command;
  startNotes: Command;
  indentTask: Command;
  outdentTask: Command;
  toggleCollapse: Command;
  togglePalette: Command;
  duplicateTask: Command;
  cycleSidebarNext: Command;
  cycleSidebarPrev: Command;
  startMoveList: Command;
  handleMoveListKeyDown: (e: KeyboardEvent) => boolean;
  indentList: Command;
  outdentList: Command;
  showListInfo: Command;
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
  isPaletteOpen: boolean;
  settingsOpen: boolean;
  isCompletedView: boolean;
  confirmationDialogOpen: boolean;
  moveListMode: boolean;
}

function getAction(id: string): Action {
  return actionMap.get(id)!;
}

function matches(e: KeyboardEvent, id: string): boolean {
  return matchesHotkey(e, getAction(id));
}

export function useKeyboardNavigation(
  actions: KeyboardActions,
  state: KeyboardState,
  setSelectedTaskIndex: (idx: number) => void,
): void {
  const focusNextFilter = useCallback(() => {
    const controls = Array.from(document.querySelectorAll<HTMLElement>('.completed-filter-bar select, .completed-filter-bar input[type="date"]'));
    if (controls.length === 0) return;
    const idx = controls.indexOf(document.activeElement as HTMLElement);
    controls[(idx + 1) % controls.length].focus();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const ctx: ActionContext = {
      focusedPane: state.focusedPane,
      editMode: !!state.editMode,
      moveMode: state.moveMode,
      settingsOpen: state.settingsOpen,
      isSearchOpen: state.isSearchOpen,
      isPaletteOpen: state.isPaletteOpen,
      isTrashView: state.isTrashView,
      hasSelectedTask: state.hasSelectedTask,
      hasSelection: state.hasSelection,
      canEdit: state.canEdit,
    };

    if (matches(e, 'openSettings')) { e.preventDefault(); actions.openSettings(); return; }
    if (matches(e, 'openSearch')) { e.preventDefault(); actions.openSearch(); return; }
    if (e.metaKey && e.key === 'k') { e.preventDefault(); actions.togglePalette(); return; }
    const metaActions: Record<string, Command> = { d: actions.duplicateTask, i: actions.showListInfo };
    if (e.metaKey && metaActions[e.key]) { e.preventDefault(); metaActions[e.key](); return; }
    if (state.isSearchOpen || state.isPaletteOpen) return;
    const active = document.activeElement;
    const isFilterControl = active instanceof HTMLSelectElement || (active instanceof HTMLInputElement && active.type === 'date');
    if (isFilterControl) {
      if (e.key === 'Escape') { (active as HTMLElement).blur(); e.preventDefault(); }
      if (e.key === 'f') { e.preventDefault(); focusNextFilter(); }
      return;
    }
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
      if (state.dueDateMode) return; // modal handles its own keys
      if (e.key === 'Escape') { e.preventDefault(); actions.cancelEdit(); }
      return;
    }
    if (matches(e, 'redo')) { e.preventDefault(); actions.redo(); return; }
    if (matches(e, 'undo')) { e.preventDefault(); actions.undo(); return; }
    if (actions.handleMoveKeyDown(e)) return;
    if (actions.handleMoveListKeyDown(e)) return;
    if (e.key === 'Escape' && state.hasSelection) { e.preventDefault(); actions.clearSelection(); return; }
    if (matches(e, 'toggleCompleted') && getAction('toggleCompleted').isAvailable(ctx)) { e.preventDefault(); actions.toggleTaskCompleted(); return; }
    if (state.cmdHeld && e.key === 'Enter' && state.focusedPane === 'tasks') { e.preventDefault(); actions.toggleAtCursor(); return; }
    if (matches(e, 'clearSelection') && !state.cmdHeld && getAction('clearSelection').isAvailable(ctx)) { e.preventDefault(); actions.clearSelection(); return; }
    if (matches(e, 'newList')) { e.preventDefault(); actions.createList(); return; }
    if (matches(e, 'newTask')) { e.preventDefault(); actions.createTask(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !state.confirmationDialogOpen) { e.preventDefault(); if (state.focusedPane === 'lists') actions.deleteList(); else actions.deleteTask(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.ctrlKey) { if (e.shiftKey) actions.cycleSidebarPrev(); else actions.cycleSidebarNext(); }
      else if (state.focusedPane === 'tasks') {
        if (e.shiftKey) { actions.outdentTask(); } else { actions.indentTask(); }
      } else if (state.focusedPane === 'lists') {
        if (e.shiftKey) { actions.outdentList(); } else { actions.indentList(); }
      }
      return;
    }
    if (e.key === 'f' && !e.metaKey && !e.ctrlKey && state.focusedPane === 'tasks' && !state.editMode && !state.moveMode && state.isCompletedView) {
      e.preventDefault(); focusNextFilter(); return;
    }
    if (matches(e, 'toggleCollapse') && getAction('toggleCollapse').isAvailable(ctx)) { e.preventDefault(); actions.toggleCollapse(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); actions.handleArrowNavigation(e); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); actions.handleHorizontalArrow(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
    if (matches(e, 'edit') && getAction('edit').isAvailable(ctx)) { e.preventDefault(); actions.startEdit(); return; }
    if (matches(e, 'moveToList') && getAction('moveToList').isAvailable(ctx)) { e.preventDefault(); actions.startMove(); return; }
    if (e.key === 'm' && !e.metaKey && state.focusedPane === 'lists' && !state.moveListMode) { e.preventDefault(); actions.startMoveList(); return; }
    if (matches(e, 'setDueDate') && getAction('setDueDate').isAvailable(ctx)) { e.preventDefault(); actions.startDueDate(); return; }
    if (matches(e, 'editNotes') && !e.metaKey && !e.shiftKey && getAction('editNotes').isAvailable(ctx)) { e.preventDefault(); actions.startNotes(); return; }
    if (matches(e, 'restoreFromTrash') && getAction('restoreFromTrash').isAvailable(ctx)) { e.preventDefault(); actions.restoreTask(); return; }
  }, [actions, state, focusNextFilter]);

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
