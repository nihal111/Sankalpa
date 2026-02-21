import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMultiSelect } from './useMultiSelect';
import type { Pane } from './types';
import { useSettingsState } from './hooks/useSettingsState';
import { useMoveState } from './hooks/useMoveState';
import { useEditState } from './hooks/useEditState';
import { useSidebarNavigation } from './hooks/useSidebarNavigation';
import { useTaskActions } from './hooks/useTaskActions';
import { useArrowNavigation } from './hooks/useArrowNavigation';
import { useDataState } from './hooks/useDataState';
import { useKeyboardNavigation, KeyboardActions, KeyboardState } from './hooks/useKeyboardNavigation';
import { useFlash } from './hooks/useFlash';
import { useUndoStack } from './hooks/useUndoStack';
import { useTrashActions } from './hooks/useTrashActions';
import { useDueDateState } from './hooks/useDueDateState';
import { useListActions, useMoveCommit } from './hooks/useListActions';

export function useAppState() {
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedSidebarIndex, setSelectedSidebarIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [multiSelect, multiSelectActions] = useMultiSelect();
  const { selectedIndices: selectedTaskIndices, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld } = multiSelect;
  const [settings, settingsActions] = useSettingsState();
  const { settingsOpen, settingsThemeIndex, themes, hardcoreMode, settingsCategory } = settings;
  const { flashIds, flash } = useFlash();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [data, dataActions] = useDataState(selectedSidebarIndex, setSelectedTaskIndex);
  const { lists, tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId, trashIndex, completedFilter, listsWithCompletedTasks } = data;
  const { reloadData, reloadTasks, setTasks, setFolders, setLists, setCompletedFilter } = dataActions;

  const listNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of lists) map[l.id] = l.name;
    return map;
  }, [lists]);

  const isCompletedView = selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed';
  const isTrashView = useMemo(() => selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'trash', [selectedSidebarItem]);

  const afterUndo = useCallback(async () => { await reloadData(); await reloadTasks(); }, [reloadData, reloadTasks]);
  const { push: undoPush, undo, redo } = useUndoStack(afterUndo);

  const [confirmationDialog, trashActions] = useTrashActions({
    selectedSidebarItem, tasks, selectedTaskIndex, lists, setSelectedTaskIndex, reloadTasks, reloadData, undoPush,
  });
  const { handlePermanentDeleteRequest, handleRestoreTask, closeConfirmationDialog } = trashActions;

  const [dueDateIndex, dueDateActions] = useDueDateState({ focusedPane, tasks, selectedTaskIndex, reloadTasks });

  const [edit, editActions, editSetters] = useEditState({
    focusedPane, selectedSidebarItem, selectedTaskIndex, tasks, reloadData, reloadTasks, undoPush,
  });
  const { editMode, editValue, inputRef } = edit;
  const { setEditMode, setEditValue } = editSetters;

  const handleMoveCommit = useMoveCommit({
    sidebarItems, tasks, multiSelectActions, setSelectedSidebarIndex, setFocusedPane, reloadData, flash, undoPush,
  });

  const [move, moveActions] = useMoveState({
    sidebarItems, selectedListId, tasks, selectedTaskIndex, selectedTaskIndices, onCommit: handleMoveCommit,
  });
  const { moveMode, moveTargetIndex } = move;

  const { createList } = useListActions({
    selectedSidebarItem, selectedSidebarIndex, setSelectedSidebarIndex, setFocusedPane, setEditMode, setEditValue, setFolders, setLists, flash, undoPush,
  });

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

  const { createTask, toggleTaskCompleted, deleteTask, handleReorder } = useTaskActions({
    focusedPane, selectedSidebarItem, selectedListId, selectedTaskIndex, tasks,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash: flash, undoPush,
    isTrashView, onPermanentDeleteRequest: handlePermanentDeleteRequest,
  });

  const handleArrowNavigation = useArrowNavigation({
    focusedPane, sidebarItemsLength: sidebarItems.length, tasksLength: tasks.length,
    selectedTaskIndex, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld, selectedTaskIndicesSize: selectedTaskIndices.size,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn), setSelectedTaskIndex, multiSelectActions, handleReorder,
  });

  const { handleHorizontalArrow } = useSidebarNavigation({
    focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn), setFocusedPane, reloadData,
  });

  const startMove = useCallback(() => { if (focusedPane === 'tasks') moveActions.start(); }, [focusedPane, moveActions]);
  const selectedTask = useMemo(() => tasks[selectedTaskIndex] ?? null, [tasks, selectedTaskIndex]);

  const switchPane = useCallback(() => {
    setFocusedPane((p) => p === 'lists' ? 'tasks' : 'lists');
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleSearchSelect = useCallback(async (taskId: string, listId: string | null) => {
    setIsSearchOpen(false);
    // Find sidebar index for the list
    let targetIndex: number;
    if (listId === null) {
      targetIndex = 0; // Inbox
    } else {
      targetIndex = sidebarItems.findIndex((item) => item.type === 'list' && item.list.id === listId);
      if (targetIndex < 0) targetIndex = 0;
    }
    setSelectedSidebarIndex(targetIndex);
    // Load tasks for that list and find task index
    const newTasks = listId === null
      ? await window.api.tasksGetInbox()
      : await window.api.tasksGetByList(listId);
    setTasks(newTasks);
    const taskIndex = newTasks.findIndex((t) => t.id === taskId);
    setSelectedTaskIndex(taskIndex >= 0 ? taskIndex : 0);
    setFocusedPane('tasks');
    flash(taskId);
  }, [sidebarItems, setTasks, flash]);

  const handleDetailEditTitle = useCallback(() => { if (selectedTask) { setFocusedPane('tasks'); editActions.start(); } }, [selectedTask, editActions]);
  const handleDetailEditDueDate = useCallback(() => { if (selectedTask) dueDateActions.start(); }, [selectedTask, dueDateActions]);
  const handleStartNotesEdit = useCallback(() => { if (selectedTask) setNotesEditing(true); }, [selectedTask]);
  const handleNotesCommit = useCallback(async (value: string) => {
    if (!selectedTask) return;
    const notes = value.trim() || null;
    await window.api.tasksUpdateNotes(selectedTask.id, notes);
    await reloadTasks();
    setNotesEditing(false);
  }, [selectedTask, reloadTasks]);
  const handleNotesCancelEdit = useCallback(() => { setNotesEditing(false); }, []);

  const keyboardActions: KeyboardActions = useMemo(() => ({
    openSettings: settingsActions.open, handleSettingsKeyDown: settingsActions.handleKeyDown, handleMoveKeyDown: moveActions.handleKeyDown,
    handleShiftDown: () => multiSelectActions.handleShiftDown(selectedTaskIndex), handleShiftUp: multiSelectActions.handleShiftUp,
    handleCmdDown: () => multiSelectActions.handleCmdDown(selectedTaskIndex), handleCmdUp: multiSelectActions.handleCmdUp,
    cancelEdit: () => { editActions.cancel(); dueDateActions.cancel(); },
    clearSelection: multiSelectActions.clear, toggleAtCursor: () => multiSelectActions.toggleAtCursor(selectedTaskIndex),
    toggleTaskCompleted, createList, createTask, deleteTask, switchPane, handleArrowNavigation, handleHorizontalArrow,
    startEdit: editActions.start, startMove, startDueDate: dueDateActions.start, commitDueDate: dueDateActions.blur, undo, redo, restoreTask: handleRestoreTask,
    openSearch, startNotes: handleStartNotesEdit,
  }), [settingsActions, moveActions, multiSelectActions, selectedTaskIndex, editActions, dueDateActions, toggleTaskCompleted, createList, createTask, deleteTask, switchPane, handleArrowNavigation, handleHorizontalArrow, startMove, undo, redo, handleRestoreTask, openSearch, handleStartNotesEdit]);

  const keyboardState: KeyboardState = useMemo(() => ({
    editMode: editMode || dueDateIndex !== null || notesEditing, dueDateMode: dueDateIndex !== null, moveMode, focusedPane, shiftHeld, cmdHeld,
    hasSelection: selectedTaskIndices.size > 0, canEdit: selectedSidebarItem?.type !== 'smart', isTrashView, hasSelectedTask: selectedTask !== null, isSearchOpen,
  }), [editMode, dueDateIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld, selectedTaskIndices.size, selectedSidebarItem?.type, isTrashView, selectedTask, isSearchOpen]);

  useKeyboardNavigation(keyboardActions, keyboardState, setSelectedTaskIndex);

  const handleSidebarClick = useCallback((index: number) => { if (hardcoreMode) return; setSelectedSidebarIndex(index); setFocusedPane('lists'); }, [hardcoreMode]);
  const handleTaskClick = useCallback((index: number) => { if (hardcoreMode) return; setSelectedTaskIndex(index); setFocusedPane('tasks'); multiSelectActions.clear(); }, [hardcoreMode, multiSelectActions]);
  const handleTaskToggle = useCallback(async (taskId: string) => { await window.api.tasksToggleCompleted(taskId); await reloadTasks(); }, [reloadTasks]);
  const handleFolderToggle = useCallback(async (folderId: string) => { if (hardcoreMode) return; await window.api.foldersToggleExpanded(folderId); await reloadData(); }, [hardcoreMode, reloadData]);

  const getSelectedListName = (): string => {
    if (selectedSidebarItem?.type === 'list') return selectedSidebarItem.list.name;
    if (selectedSidebarItem?.type === 'smart') return selectedSidebarItem.smartList.name;
    return 'Tasks';
  };
  const getMoveTargetName = (): string => { const item = sidebarItems[moveTargetIndex]; return item?.type === 'list' ? item.list.name : ''; };

  return {
    sidebarItems, selectedSidebarIndex, focusedPane, moveMode, moveTargetIndex,
    editMode, editValue, setEditValue, setEditMode, handleInputKeyDown: editActions.handleInputKeyDown, inputRef,
    taskCounts, tasks, selectedTaskIndex, selectedTaskIndices, shiftHeld, cmdHeld, boundaryCursor,
    settingsOpen, settingsThemeIndex, settingsCategory, themes, hardcoreMode,
    getSelectedListName, getMoveTargetName, handleSidebarClick, handleTaskClick, handleTaskToggle, handleFolderToggle,
    flashIds, listNames, isCompletedView, dueDateIndex, commitDueDate: dueDateActions.commit,
    trashIndex, isTrashView, lists, confirmationDialog, closeConfirmationDialog,
    completedFilter: isCompletedView ? completedFilter : undefined, onFilterChange: isCompletedView ? setCompletedFilter : undefined,
    listsWithCompletedTasks: isCompletedView ? listsWithCompletedTasks : undefined, selectedTask, handleDetailEditTitle, handleDetailEditDueDate,
    isSearchOpen, lastSearchQuery, closeSearch, handleSearchSelect, setLastSearchQuery,
    notesEditing, handleStartNotesEdit, handleNotesCommit, handleNotesCancelEdit,
  };
}
