import { useState, useCallback, useMemo } from 'react';
import type { ActionContext } from '../actionRegistry';
import type { Pane, SidebarItem } from '../types';
import type { Task } from '../../shared/types';

interface UsePaletteStateParams {
  focusedPane: Pane;
  editMode: boolean;
  moveMode: boolean;
  settingsOpen: boolean;
  isSearchOpen: boolean;
  isTrashView: boolean;
  selectedTask: Task | null;
  selectedTaskIndicesSize: number;
  selectedSidebarItem: SidebarItem | undefined;
}

interface PaletteActions {
  settingsOpen: () => void;
  openSearch: () => void;
  undo: () => void;
  redo: () => void;
  createTask: () => void;
  createList: () => void;
  switchPane: () => void;
  deleteTask: () => void;
  toggleTaskCompleted: () => void;
  startEdit: () => void;
  startMove: () => void;
  startDueDate: () => void;
  handleStartNotesEdit: () => void;
  indentTask: () => void;
  outdentTask: () => void;
  toggleCollapse: () => void;
  handleRestoreTask: () => void;
  clearSelection: () => void;
}

interface UsePaletteStateResult {
  isPaletteOpen: boolean;
  togglePalette: () => void;
  closePalette: () => void;
  paletteContext: ActionContext;
  executePaletteAction: (actionId: string) => void;
}

export function usePaletteState(
  params: UsePaletteStateParams,
  actions: PaletteActions,
): UsePaletteStateResult {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const closePalette = useCallback(() => { setIsPaletteOpen(false); }, []);
  const togglePalette = useCallback(() => { setIsPaletteOpen((v) => !v); }, []);

  const paletteContext = useMemo((): ActionContext => ({
    focusedPane: params.focusedPane,
    editMode: params.editMode,
    moveMode: params.moveMode,
    settingsOpen: params.settingsOpen,
    isSearchOpen: params.isSearchOpen,
    isPaletteOpen,
    isTrashView: params.isTrashView,
    hasSelectedTask: !!params.selectedTask,
    hasSelection: params.selectedTaskIndicesSize > 0,
    canEdit: params.selectedSidebarItem?.type === 'list' || params.selectedSidebarItem?.type === 'folder',
  }), [params.focusedPane, params.editMode, params.moveMode, params.settingsOpen, params.isSearchOpen, isPaletteOpen, params.isTrashView, params.selectedTask, params.selectedTaskIndicesSize, params.selectedSidebarItem]);

  const executePaletteAction = useCallback((actionId: string) => {
    const handlers: Record<string, () => void> = {
      openSettings: actions.settingsOpen,
      openSearch: actions.openSearch,
      undo: actions.undo,
      redo: actions.redo,
      newTask: actions.createTask,
      newList: actions.createList,
      switchPane: actions.switchPane,
      delete: actions.deleteTask,
      toggleCompleted: actions.toggleTaskCompleted,
      edit: actions.startEdit,
      moveToList: actions.startMove,
      setDueDate: actions.startDueDate,
      editNotes: actions.handleStartNotesEdit,
      indent: actions.indentTask,
      outdent: actions.outdentTask,
      toggleCollapse: actions.toggleCollapse,
      restoreFromTrash: actions.handleRestoreTask,
      clearSelection: actions.clearSelection,
    };
    handlers[actionId]?.();
  }, [actions]);

  return { isPaletteOpen, togglePalette, closePalette, paletteContext, executePaletteAction };
}
