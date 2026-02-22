import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMultiSelect } from './useMultiSelect';
import type { Pane } from './types';
import { useSettingsState } from './hooks/useSettingsState';
import { useMoveState } from './hooks/useMoveState';
import { useEditState } from './hooks/useEditState';
import { useSidebarNavigation } from './hooks/useSidebarNavigation';
import { useTaskActions } from './hooks/useTaskActions';
import { useTaskNesting } from './hooks/useTaskNesting';
import { useTrashActions } from './hooks/useTrashActions';
import { useArrowNavigation } from './hooks/useArrowNavigation';
import { useDataState } from './hooks/useDataState';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useKeyboardActions, useKeyboardState } from './hooks/useKeyboardActions';
import { useFlash } from './hooks/useFlash';
import { useUndoStack } from './hooks/useUndoStack';
import { useDueDateState } from './hooks/useDueDateState';
import { useListActions, useMoveCommit } from './hooks/useListActions';
import { usePaletteState } from './hooks/usePaletteState';
import { useSearchState } from './hooks/useSearchState';
import { useContextMenu } from './hooks/useContextMenu';
import { flattenWithDepth } from './utils/taskTree';
import { useDragDrop } from './hooks/useDragDrop';

export function useAppState() {
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedSidebarIndex, setSelectedSidebarIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [multiSelect, multiSelectActions] = useMultiSelect();
  const { selectedIndices: selectedTaskIndices, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld } = multiSelect;
  const [settings, settingsActions] = useSettingsState();
  const { settingsOpen, settingsThemeIndex, themes, hardcoreMode, settingsCategory, trashRetentionIndex, retentionOptions } = settings;
  const { flashIds, flash } = useFlash();
  const { flashIds: throbIds, flash: throb } = useFlash();
  const { flashIds: completeIds, flash: completeFlash } = useFlash(500);
  const { flashIds: uncompleteIds, flash: uncompleteFlash } = useFlash(500);
  const { flashIds: moveIds, flash: moveFlash } = useFlash(500);
  const { flashIds: evaporateIds, flash: evaporateFlash } = useFlash();
  const [notesEditing, setNotesEditing] = useState(false);

  const [data, dataActions] = useDataState(selectedSidebarIndex, setSelectedTaskIndex);
  const { lists, tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId, trashIndex, completedFilter, listsWithCompletedTasks } = data;
  const { reloadData, reloadTasks, setTasks, setFolders, setLists, setCompletedFilter } = dataActions;

  const listNames = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l.name])), [lists]);
  const isCompletedView = selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed';
  const isTrashView = useMemo(() => selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'trash', [selectedSidebarItem]);
  const flatTasks = useMemo(() => flattenWithDepth(tasks), [tasks]);

  const afterUndo = useCallback(async () => { await reloadData(); await reloadTasks(); }, [reloadData, reloadTasks]);
  const { push: undoPush, undo, redo } = useUndoStack(afterUndo);

  const trashActions = useTrashActions({
    isTrashView, tasks, lists, selectedTaskIndex, setSelectedTaskIndex, reloadTasks, reloadData, undoPush,
  });

  const [dueDateIndex, dueDateActions] = useDueDateState({ focusedPane, tasks, selectedTaskIndex, reloadTasks });

  const [edit, editActions, editSetters] = useEditState({ focusedPane, selectedSidebarItem, selectedTaskIndex, tasks, reloadData, reloadTasks, undoPush, onEvaporate: evaporateFlash });
  const { editMode, editValue, inputRef } = edit;
  const { setEditMode, setEditValue } = editSetters;

  const handleMoveCommit = useMoveCommit({
    sidebarItems, tasks, multiSelectActions, setSelectedSidebarIndex, setFocusedPane, reloadData, flash: moveFlash, undoPush,
  });

  const [move, moveActions] = useMoveState({
    sidebarItems, selectedListId, tasks, selectedTaskIndex, selectedTaskIndices, onCommit: handleMoveCommit,
  });
  const { moveMode, moveTargetIndex } = move;

  const { createList, createFolder, deleteList, duplicateList, listConfirmationDialog, closeListConfirmation } = useListActions({
    selectedSidebarItem, selectedSidebarIndex, setSelectedSidebarIndex, setFocusedPane, setEditMode, setEditValue, setFolders, setLists, flash, undoPush, taskCounts,
  });

  const searchState = useSearchState({ sidebarItems, setTasks, setSelectedSidebarIndex, setSelectedTaskIndex, setFocusedPane, flash });
  const { isSearchOpen, lastSearchQuery, setLastSearchQuery, openSearch, closeSearch, handleSearchSelect } = searchState;

  useEffect(() => {
    return window.api.onQuickAdd(async () => {
      setSelectedSidebarIndex(0);
      const id = crypto.randomUUID();
      const newTask = await window.api.tasksCreate(id, null, '');
      const newTasks = await window.api.tasksGetInbox();
      const newIndex = newTasks.findIndex((t) => t.id === newTask.id);
      setTasks(newTasks);
      setSelectedTaskIndex(newIndex);
      setFocusedPane('tasks');
      setEditMode({ type: 'task', index: newIndex });
      setEditValue('');
    });
  }, [setEditMode, setEditValue, setTasks]);

  const { createTask, toggleTaskCompleted, deleteTask, duplicateTask } = useTaskActions({
    focusedPane, selectedSidebarItem, selectedListId, selectedTaskIndex, tasks,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash: flash, onCompleteFlash: (id: string, wasCompleted: boolean) => wasCompleted ? uncompleteFlash(id) : completeFlash(id), undoPush,
    isTrashView, onPermanentDeleteRequest: trashActions.handlePermanentDeleteRequest,
    onCascadeComplete: trashActions.handleCascadeComplete, onCascadeDelete: trashActions.handleCascadeDelete,
  });

  const { handleReorder, indentTask, outdentTask, toggleCollapse } = useTaskNesting({
    focusedPane, selectedTaskIndex, tasks, flatTasks, setSelectedTaskIndex, reloadTasks, onFlash: flash, onThrob: throb, undoPush,
  });

  const handleArrowNavigation = useArrowNavigation({
    focusedPane, sidebarItemsLength: sidebarItems.length, tasksLength: tasks.length,
    selectedTaskIndex, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld, selectedTaskIndicesSize: selectedTaskIndices.size,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn), setSelectedTaskIndex, multiSelectActions, handleReorder,
  });

  const { handleHorizontalArrow } = useSidebarNavigation({
    focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn), setFocusedPane, reloadData, clearSelection: multiSelectActions.clear,
  });

  const selectedTask = useMemo(() => tasks[selectedTaskIndex] ?? null, [tasks, selectedTaskIndex]);

  const handleDetailEditTitle = useCallback(() => { if (selectedTask) { setFocusedPane('tasks'); editActions.start(); } }, [selectedTask, editActions]);
  const handleDetailEditDueDate = useCallback(() => { if (selectedTask) dueDateActions.start(); }, [selectedTask, dueDateActions]);
  const handleStartNotesEdit = useCallback(() => { if (selectedTask) setNotesEditing(true); }, [selectedTask]);
  const handleNotesCommit = useCallback(async (value: string) => {
    if (!selectedTask) return;
    await window.api.tasksUpdateNotes(selectedTask.id, value.trim() || null);
    await reloadTasks();
    setNotesEditing(false);
  }, [selectedTask, reloadTasks]);
  const handleNotesCancelEdit = useCallback(() => { setNotesEditing(false); }, []);

  const paletteState = usePaletteState({
    focusedPane, editMode: !!editMode, moveMode, settingsOpen, isSearchOpen, isTrashView,
    selectedTask, selectedTaskIndicesSize: selectedTaskIndices.size, selectedSidebarItem,
  }, {
    settingsOpen: settingsActions.open, openSearch, undo, redo, createTask, createList, createFolder,
    deleteTask, toggleTaskCompleted, startEdit: editActions.start, startMove: moveActions.start,
    startDueDate: dueDateActions.start, handleStartNotesEdit, indentTask, outdentTask, toggleCollapse,
    handleRestoreTask: trashActions.handleRestoreTask, clearSelection: multiSelectActions.clear,
    duplicateTask, duplicateList,
  });
  const { isPaletteOpen, togglePalette, closePalette, paletteContext, executePaletteAction } = paletteState;

  const keyboardActions = useKeyboardActions({
    settingsActions, moveActions, multiSelectActions, editActions, dueDateActions,
    selectedTaskIndex, toggleTaskCompleted, createList, createTask, deleteTask,
    handleArrowNavigation, handleHorizontalArrow, undo, redo,
    handleRestoreTask: trashActions.handleRestoreTask, focusedPane, openSearch, handleStartNotesEdit,
    indentTask, outdentTask, toggleCollapse, deleteList, togglePalette,
    duplicateTask,
  });

  const keyboardState = useKeyboardState({
    editMode, dueDateIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld,
    selectedTaskIndicesSize: selectedTaskIndices.size, selectedSidebarItem, isTrashView, selectedTask, isSearchOpen, isPaletteOpen, settingsOpen, isCompletedView,
    confirmationDialogOpen: trashActions.confirmationDialog !== null || listConfirmationDialog !== null,
  });

  useKeyboardNavigation(keyboardActions, keyboardState, setSelectedTaskIndex);

  const dragDrop = useDragDrop({
    hardcoreMode, tasks, flatTasksLength: flatTasks.length,
    selectedTaskIndex, selectedTaskIndices, sidebarItems,
    reloadTasks, reloadData, setSelectedTaskIndex, setSelectedSidebarIndex, setFocusedPane,
    flash, moveFlash, undoPush,
    multiSelectClear: multiSelectActions.clear,
  });

  const handleSidebarClick = useCallback((index: number) => { if (hardcoreMode) return; setSelectedSidebarIndex(index); setFocusedPane('lists'); }, [hardcoreMode]);
  const handleTaskClick = useCallback((index: number) => { if (hardcoreMode) return; setSelectedTaskIndex(index); setFocusedPane('tasks'); multiSelectActions.clear(); }, [hardcoreMode, multiSelectActions]);
  const handleTaskToggle = useCallback(async (taskId: string) => { await window.api.tasksToggleCompleted(taskId); await reloadTasks(); }, [reloadTasks]);
  const handleFolderToggle = useCallback(async (folderId: string) => { if (hardcoreMode) return; await window.api.foldersToggleExpanded(folderId); await reloadData(); }, [hardcoreMode, reloadData]);

  const ctxMenu = useContextMenu({
    hardcoreMode, tasks, sidebarItems, setSelectedTaskIndex, setSelectedSidebarIndex, setFocusedPane,
    editActions, moveActions, dueDateActions, toggleTaskCompleted, deleteTask, deleteList,
  });

  const getSelectedListName = (): string => selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list.name : selectedSidebarItem?.type === 'smart' ? selectedSidebarItem.smartList.name : 'Tasks';
  const getMoveTargetName = (): string => { const item = sidebarItems[moveTargetIndex]; return item?.type === 'list' ? item.list.name : ''; };

  return {
    sidebarItems, selectedSidebarIndex, focusedPane, moveMode, moveTargetIndex,
    editMode, editValue, setEditValue, setEditMode, handleInputKeyDown: editActions.handleInputKeyDown, handleEditBlur: editActions.commit, inputRef,
    taskCounts, tasks, selectedTaskIndex, selectedTaskIndices, shiftHeld, cmdHeld, boundaryCursor,
    settingsOpen, settingsThemeIndex, settingsCategory, themes, hardcoreMode, trashRetentionIndex, retentionOptions,
    getSelectedListName, getMoveTargetName, handleSidebarClick, handleTaskClick, handleTaskToggle, handleFolderToggle,
    handleTaskContextMenu: ctxMenu.handleTaskContextMenu, handleSidebarContextMenu: ctxMenu.handleSidebarContextMenu,
    contextMenu: ctxMenu.contextMenu, closeContextMenu: ctxMenu.closeContextMenu,
    flashIds, throbIds, completeIds, uncompleteIds, moveIds, evaporateIds, flatTasks, listNames, isCompletedView, dueDateIndex, commitDueDate: dueDateActions.commit, cancelDueDate: dueDateActions.cancel,
    trashIndex, isTrashView, lists, confirmationDialog: trashActions.confirmationDialog || listConfirmationDialog, closeConfirmationDialog: trashActions.confirmationDialog ? trashActions.closeConfirmationDialog : closeListConfirmation,
    completedFilter: isCompletedView ? completedFilter : undefined, onFilterChange: isCompletedView ? setCompletedFilter : undefined,
    listsWithCompletedTasks: isCompletedView ? listsWithCompletedTasks : undefined, selectedTask, handleDetailEditTitle, handleDetailEditDueDate,
    isSearchOpen, lastSearchQuery, closeSearch, handleSearchSelect, setLastSearchQuery,
    notesEditing, handleStartNotesEdit, handleNotesCommit, handleNotesCancelEdit,
    dragState: dragDrop.state, taskDragProps: dragDrop.taskDragProps, sidebarDropProps: dragDrop.sidebarDropProps,
    isPaletteOpen, togglePalette, closePalette, paletteContext, executePaletteAction,
  };
}
