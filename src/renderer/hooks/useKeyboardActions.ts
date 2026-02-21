import { useMemo, useCallback } from 'react';
import type { KeyboardActions, KeyboardState } from './useKeyboardNavigation';
import type { Task } from '../../shared/types';
import type { SidebarItem, Pane } from '../types';

interface UseKeyboardActionsParams {
  settingsActions: { open: () => void; handleKeyDown: (e: KeyboardEvent) => boolean };
  moveActions: { handleKeyDown: (e: KeyboardEvent) => boolean; start: () => void };
  multiSelectActions: {
    handleShiftDown: (index: number) => void;
    handleShiftUp: () => void;
    handleCmdDown: (index: number) => void;
    handleCmdUp: () => number | null;
    clear: () => void;
    toggleAtCursor: (index: number) => void;
  };
  editActions: { start: () => void; cancel: () => void };
  dueDateActions: { start: () => void; cancel: () => void; blur: () => void };
  selectedTaskIndex: number;
  toggleTaskCompleted: () => void;
  createList: () => Promise<void>;
  createTask: () => void;
  deleteTask: () => void;
  switchPane: () => void;
  handleArrowNavigation: (e: KeyboardEvent) => void;
  handleHorizontalArrow: (dir: 'left' | 'right') => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  handleRestoreTask: () => Promise<void>;
  focusedPane: Pane;
  openSearch: () => void;
  handleStartNotesEdit: () => void;
}

export function useKeyboardActions(params: UseKeyboardActionsParams): KeyboardActions {
  const {
    settingsActions, moveActions, multiSelectActions, editActions, dueDateActions,
    selectedTaskIndex, toggleTaskCompleted, createList, createTask, deleteTask,
    switchPane, handleArrowNavigation, handleHorizontalArrow, undo, redo,
    handleRestoreTask, focusedPane, openSearch, handleStartNotesEdit,
  } = params;

  const startMove = useCallback(() => {
    if (focusedPane === 'tasks') moveActions.start();
  }, [focusedPane, moveActions]);

  return useMemo(() => ({
    openSettings: settingsActions.open,
    handleSettingsKeyDown: settingsActions.handleKeyDown,
    handleMoveKeyDown: moveActions.handleKeyDown,
    handleShiftDown: () => multiSelectActions.handleShiftDown(selectedTaskIndex),
    handleShiftUp: multiSelectActions.handleShiftUp,
    handleCmdDown: () => multiSelectActions.handleCmdDown(selectedTaskIndex),
    handleCmdUp: multiSelectActions.handleCmdUp,
    cancelEdit: () => { editActions.cancel(); dueDateActions.cancel(); },
    clearSelection: multiSelectActions.clear,
    toggleAtCursor: () => multiSelectActions.toggleAtCursor(selectedTaskIndex),
    toggleTaskCompleted,
    createList,
    createTask,
    deleteTask,
    switchPane,
    handleArrowNavigation,
    handleHorizontalArrow,
    startEdit: editActions.start,
    startMove,
    startDueDate: dueDateActions.start,
    commitDueDate: dueDateActions.blur,
    undo,
    redo,
    restoreTask: handleRestoreTask,
    openSearch,
    startNotes: handleStartNotesEdit,
  }), [
    settingsActions, moveActions, multiSelectActions, selectedTaskIndex,
    editActions, dueDateActions, toggleTaskCompleted, createList, createTask,
    deleteTask, switchPane, handleArrowNavigation, handleHorizontalArrow,
    startMove, undo, redo, handleRestoreTask, openSearch, handleStartNotesEdit,
  ]);
}

interface UseKeyboardStateParams {
  editMode: unknown;
  dueDateIndex: number | null;
  notesEditing: boolean;
  moveMode: boolean;
  focusedPane: Pane;
  shiftHeld: boolean;
  cmdHeld: boolean;
  selectedTaskIndicesSize: number;
  selectedSidebarItem: SidebarItem | undefined;
  isTrashView: boolean;
  selectedTask: Task | null;
  isSearchOpen: boolean;
}

export function useKeyboardState(params: UseKeyboardStateParams): KeyboardState {
  const {
    editMode, dueDateIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld,
    selectedTaskIndicesSize, selectedSidebarItem, isTrashView, selectedTask, isSearchOpen,
  } = params;

  return useMemo(() => ({
    editMode: editMode || dueDateIndex !== null || notesEditing,
    dueDateMode: dueDateIndex !== null,
    moveMode,
    focusedPane,
    shiftHeld,
    cmdHeld,
    hasSelection: selectedTaskIndicesSize > 0,
    canEdit: selectedSidebarItem?.type !== 'smart',
    isTrashView,
    hasSelectedTask: selectedTask !== null,
    isSearchOpen,
  }), [editMode, dueDateIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld, selectedTaskIndicesSize, selectedSidebarItem?.type, isTrashView, selectedTask, isSearchOpen]);
}
