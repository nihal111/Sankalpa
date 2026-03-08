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
  dueDateActions: { start: () => void; cancel: () => void };
  durationActions: { start: () => void; cancel: () => void };
  selectedTaskIndex: number;
  toggleTaskCompleted: () => void;
  createList: () => Promise<void>;
  createTask: () => void;
  createTaskBelow: () => void;
  deleteTask: () => void;
  handleArrowNavigation: (e: KeyboardEvent) => void;
  handleHorizontalArrow: (dir: 'left' | 'right') => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  handleRestoreTask: () => Promise<void>;
  openInActualList: () => Promise<void>;
  focusedPane: Pane;
  openSearch: () => void;
  handleStartNotesEdit: () => void;
  indentTask: () => void;
  outdentTask: () => void;
  toggleCollapse: () => void;
  toggleFolderCollapse: () => void;
  deleteList: () => void;
  togglePalette: () => void;
  duplicateTask: () => void;
  copyTasks: () => void;
  cutTasks: () => void;
  createFromClipboard: () => void;
  cycleSidebarNext: () => void;
  cycleSidebarPrev: () => void;
  startMoveList: () => void;
  handleMoveListKeyDown: (e: KeyboardEvent) => boolean;
  indentList: () => void;
  outdentList: () => void;
  showListInfo: () => void;
  closeListInfo: () => void;
  selectSidebarByListNumber: (n: number) => void;
  toggleLocalSearch: () => void;
  selectAllTasks: () => void;
  reorderListUp: () => void;
  reorderListDown: () => void;
}

export function useKeyboardActions(params: UseKeyboardActionsParams): KeyboardActions {
  const {
    settingsActions, moveActions, multiSelectActions, editActions, dueDateActions, durationActions,
    selectedTaskIndex, toggleTaskCompleted, createList, createTask, deleteTask,
    createTaskBelow,
    handleArrowNavigation, handleHorizontalArrow, undo, redo,
    handleRestoreTask, openInActualList, focusedPane, openSearch, handleStartNotesEdit,
    indentTask, outdentTask, toggleCollapse, toggleFolderCollapse, deleteList, togglePalette, duplicateTask, copyTasks, cutTasks, createFromClipboard,
    cycleSidebarNext, cycleSidebarPrev,
    startMoveList, handleMoveListKeyDown,
    indentList, outdentList,
    showListInfo, closeListInfo, selectSidebarByListNumber, toggleLocalSearch,
    selectAllTasks, reorderListUp, reorderListDown,
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
    cancelEdit: () => { editActions.cancel(); dueDateActions.cancel(); durationActions.cancel(); },
    clearSelection: multiSelectActions.clear,
    toggleAtCursor: () => multiSelectActions.toggleAtCursor(selectedTaskIndex),
    toggleTaskCompleted,
    createList,
    createTask,
    createTaskBelow,
    deleteTask,
    deleteList,
    handleArrowNavigation,
    handleHorizontalArrow,
    startEdit: editActions.start,
    startMove,
    startDueDate: dueDateActions.start,
    startDuration: durationActions.start,
    undo,
    redo,
    restoreTask: handleRestoreTask,
    openInActualList,
    openSearch,
    startNotes: handleStartNotesEdit,
    indentTask,
    outdentTask,
    toggleCollapse,
    toggleFolderCollapse,
    togglePalette,
    duplicateTask,
    copyTasks,
    cutTasks,
    createFromClipboard,
    cycleSidebarNext,
    cycleSidebarPrev,
    startMoveList,
    handleMoveListKeyDown,
    indentList,
    outdentList,
    showListInfo,
    closeListInfo,
    selectSidebarByListNumber,
    toggleLocalSearch,
    selectAllTasks,
    reorderListUp,
    reorderListDown,
  }), [
    settingsActions, moveActions, multiSelectActions, selectedTaskIndex,
    editActions, dueDateActions, durationActions, toggleTaskCompleted, createList, createTask, createTaskBelow,
    deleteTask, handleArrowNavigation, handleHorizontalArrow,
    startMove, undo, redo, handleRestoreTask, openInActualList, openSearch, handleStartNotesEdit,
    indentTask, outdentTask, toggleCollapse, toggleFolderCollapse, deleteList, togglePalette, duplicateTask, copyTasks, cutTasks, createFromClipboard,
    cycleSidebarNext, cycleSidebarPrev, startMoveList, handleMoveListKeyDown,
    indentList, outdentList, showListInfo, closeListInfo, selectSidebarByListNumber, toggleLocalSearch,
    selectAllTasks, reorderListUp, reorderListDown,
  ]);
}

interface UseKeyboardStateParams {
  editMode: unknown;
  dueDateIndex: number | null;
  durationIndex: number | null;
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
  isPaletteOpen: boolean;
  settingsOpen: boolean;
  isCompletedView: boolean;
  confirmationDialogOpen: boolean;
  moveListMode: boolean;
  listInfoOpen: boolean;
  quickAddOpen: boolean;
}

export function useKeyboardState(params: UseKeyboardStateParams): KeyboardState {
  const {
    editMode, dueDateIndex, durationIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld,
    selectedTaskIndicesSize, selectedSidebarItem, isTrashView, selectedTask, isSearchOpen, isPaletteOpen, settingsOpen, isCompletedView, confirmationDialogOpen, moveListMode, listInfoOpen, quickAddOpen,
  } = params;

  return useMemo(() => ({
    editMode: editMode || dueDateIndex !== null || durationIndex !== null || notesEditing,
    dueDateMode: dueDateIndex !== null,
    durationMode: durationIndex !== null,
    moveMode,
    focusedPane,
    shiftHeld,
    cmdHeld,
    hasSelection: selectedTaskIndicesSize > 0,
    canEdit: selectedSidebarItem?.type !== 'smart',
    isSmartListNonInbox: selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id !== 'inbox',
    isTrashView,
    hasSelectedTask: selectedTask !== null,
    isSearchOpen,
    isPaletteOpen,
    settingsOpen,
    isCompletedView,
    confirmationDialogOpen,
    moveListMode,
    listInfoOpen,
    quickAddOpen,
  }), [editMode, dueDateIndex, durationIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld, selectedTaskIndicesSize, selectedSidebarItem, isTrashView, selectedTask, isSearchOpen, isPaletteOpen, settingsOpen, isCompletedView, confirmationDialogOpen, moveListMode, listInfoOpen, quickAddOpen]);
}
