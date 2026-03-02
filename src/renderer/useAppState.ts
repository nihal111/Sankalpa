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
import { useDurationState } from './hooks/useDurationState';
import { useListActions, useMoveCommit } from './hooks/useListActions';
import { usePaletteState } from './hooks/usePaletteState';
import { useSearchState } from './hooks/useSearchState';
import { useContextMenu } from './hooks/useContextMenu';
import { flattenWithDepth } from './utils/taskTree';
import { useMoveListState } from './hooks/useMoveListState';
import { useDragDrop } from './hooks/useDragDrop';
import { useMetaKey } from './hooks/useMetaKey';
import { useNotesState } from './hooks/useNotesState';
import { useFolderView } from './hooks/useFolderView';
import { useToast } from './hooks/useToast';

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
  const toast = useToast();
  const metaHeld = useMetaKey();
  const [localSearchOpen, setLocalSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [data, dataActions] = useDataState(selectedSidebarIndex, selectedTaskIndex, setSelectedTaskIndex);
  const { lists, tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId, trashIndex, completedFilter, listsWithCompletedTasks, folders } = data;
  const { reloadData, reloadTasks: reloadTasksBase, setTasks, setFolders, setLists, setCompletedFilter } = dataActions;
  const listNames = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l.name])), [lists]);
  const isCompletedView = selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed';
  const isTrashView = useMemo(() => selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'trash', [selectedSidebarItem]);
  const showSourceList = useMemo(() => {
    if (selectedSidebarItem?.type !== 'smart') return false;
    const id = selectedSidebarItem.smartList.id;
    return id === 'trash' || id === 'today' || id === 'overdue' || id === 'upcoming';
  }, [selectedSidebarItem]);
  const flatTasks = useMemo(() => flattenWithDepth(tasks), [tasks]);
  const filteredFlatTasks = useMemo(() => {
    if (!localSearchOpen || !localSearchQuery.trim()) return flatTasks;
    const q = localSearchQuery.toLowerCase();
    return flatTasks.filter(ft => ft.task.title.toLowerCase().includes(q) || (ft.task.notes?.toLowerCase().includes(q) ?? false));
  }, [flatTasks, localSearchOpen, localSearchQuery]);
  const selectedTask = useMemo(() => flatTasks[selectedTaskIndex]?.task ?? null, [flatTasks, selectedTaskIndex]);
  const isFolder = selectedSidebarItem?.type === 'folder';
  const folderView = useFolderView(selectedSidebarItem, lists);
  const effectiveTasksLength = isFolder ? folderView.rows.length : flatTasks.length;
  const reloadTasks = useCallback(async () => { await reloadTasksBase(); if (isFolder) folderView.reload(); }, [reloadTasksBase, isFolder, folderView]);
  // For drag/drop: map row index to task info
  const getTaskAtIndex = useCallback((i: number) => {
    if (!isFolder) {
      const t = flatTasks[i]?.task;
      return t ? { id: t.id, sort_key: t.sort_key, list_id: t.list_id } : undefined;
    }
    const row = folderView.rows[i];
    if (row?.type === 'task') {
      const t = row.task;
      return { id: t.id, sort_key: t.sort_key, list_id: t.list_id };
    }
    return undefined;
  }, [isFolder, flatTasks, folderView.rows]);
  // For drag/drop: find adjacent sibling (same parent_id) for sort key calculation
  const getAdjacentSibling = useCallback((index: number, direction: 'before' | 'after') => {
    if (!isFolder) {
      const current = flatTasks[index];
      if (!current) return undefined;
      const parentId = current.effectiveParentId;
      const step = direction === 'before' ? -1 : 1;
      for (let j = index + step; j >= 0 && j < flatTasks.length; j += step) {
        const candidate = flatTasks[j];
        if (candidate.effectiveParentId === parentId) {
          return { id: candidate.task.id, sort_key: candidate.task.sort_key, list_id: candidate.task.list_id };
        }
        // If we hit a task at same or lower depth with different parent, stop
        if (candidate.depth <= current.depth && candidate.effectiveParentId !== parentId) break;
      }
      return undefined;
    }
    // In folder view, search for adjacent task in the same list
    const step = direction === 'before' ? -1 : 1;
    const targetListId = folderView.rows[index]?.type === 'task' ? folderView.rows[index].task.list_id : null;
    for (let j = index + step; j >= 0 && j < folderView.rows.length; j += step) {
      const row = folderView.rows[j];
      if (row.type === 'header') break;
      if (row.type === 'task' && row.task.list_id === targetListId) {
        return { id: row.task.id, sort_key: row.task.sort_key, list_id: row.task.list_id };
      }
    }
    return undefined;
  }, [isFolder, flatTasks, folderView.rows]);
  const afterUndo = useCallback(async () => { await reloadData(); await reloadTasks(); }, [reloadData, reloadTasks]);
  const { push: undoPush, undo, redo } = useUndoStack(afterUndo);
  const trashActions = useTrashActions({ isTrashView, tasks, flatTasks, lists, selectedTaskIndex, selectedTaskIndices, setSelectedTaskIndex, multiSelectClear: multiSelectActions.clear, reloadTasks, undoPush });
  const [dueDateIndex, dueDateActions] = useDueDateState({ focusedPane, selectedTask, selectedTaskIndex, reloadTasks });
  const [durationIndex, durationActions] = useDurationState({ focusedPane, selectedTask, selectedTaskIndex, reloadTasks });
  const [edit, editActions, editSetters] = useEditState({ focusedPane, selectedSidebarItem, selectedTask, selectedTaskIndex, reloadData, reloadTasks, undoPush, onEvaporate: evaporateFlash });
  const { editMode, editValue, inputRef } = edit;
  const { setEditMode, setEditValue } = editSetters;
  const handleMoveCommit = useMoveCommit({ sidebarItems, tasks, multiSelectActions, setSelectedSidebarIndex, setFocusedPane, reloadData, flash: moveFlash, undoPush });
  const [move, moveActions] = useMoveState({
    sidebarItems, selectedListId, selectedTask, flatTasks, selectedTaskIndex, selectedTaskIndices, onCommit: handleMoveCommit,
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

  const { createTask, toggleTaskCompleted, deleteTask, duplicateTask, copyTasks } = useTaskActions({
    focusedPane, selectedSidebarItem, selectedListId, selectedTask, tasks, flatTasks, selectedTaskIndex, selectedTaskIndices,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash: flash, onCompleteFlash: (id: string, wasCompleted: boolean) => wasCompleted ? uncompleteFlash(id) : completeFlash(id), undoPush,
    isTrashView, onPermanentDeleteRequest: trashActions.handlePermanentDeleteRequest,
    onCascadeComplete: trashActions.handleCascadeComplete, onCascadeDelete: trashActions.handleCascadeDelete, multiSelectClear: multiSelectActions.clear,
    showToast: toast.show,
  });

  const { handleReorder, indentTask, outdentTask, toggleCollapse } = useTaskNesting({
    focusedPane, selectedTaskIndex, tasks, flatTasks, setSelectedTaskIndex, reloadTasks, onFlash: flash, onThrob: throb, undoPush,
  });

  const handleArrowNavigation = useArrowNavigation({
    focusedPane, sidebarItems, taskCounts, tasksLength: effectiveTasksLength,
    selectedTaskIndex, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld, selectedTaskIndicesSize: selectedTaskIndices.size,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn), setSelectedTaskIndex, multiSelectActions, handleReorder,
  });

  const { handleHorizontalArrow } = useSidebarNavigation({
    focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn), setFocusedPane, reloadData, clearSelection: multiSelectActions.clear,
  });

  const handleDetailEditTitle = useCallback(() => { if (selectedTask) { setFocusedPane('tasks'); editActions.start(); } }, [selectedTask, editActions, setFocusedPane]);
  const handleDetailEditDueDate = useCallback(() => { if (selectedTask) dueDateActions.start(); }, [selectedTask, dueDateActions]);
  const handleDetailEditDuration = useCallback(() => { if (selectedTask) durationActions.start(); }, [selectedTask, durationActions]);
  const { notesEditing, handleStartNotesEdit, handleNotesCommit, handleNotesCancelEdit } = useNotesState({ selectedTask, reloadTasks });

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

  const { moveListMode, getMoveListTargetName, moveListTargets, moveListTargetIndex, startMoveList, handleMoveListKeyDown, indentList, outdentList, cycleSidebarNext, cycleSidebarPrev, selectSidebarByListNumber } = useMoveListState({
    folders, selectedSidebarItem, sidebarItems, selectedSidebarIndex, sidebarItemsLength: sidebarItems.length, setSelectedSidebarIndex, reloadData, undoPush,
  });

  const [listInfoOpen, setListInfoOpen] = useState(false);
  const showListInfo = useCallback(() => setListInfoOpen(true), []);
  const closeListInfo = useCallback(() => setListInfoOpen(false), []);
  const handleListNotesChange = useCallback(async (listId: string, notes: string | null) => { await window.api.listsUpdateNotes(listId, notes); await reloadData(); }, [reloadData]);

  const toggleFolderCollapse = useCallback(async () => {
    if (selectedSidebarItem?.type === 'folder') {
      await window.api.foldersToggleExpanded(selectedSidebarItem.folder.id);
      await reloadData();
    }
  }, [selectedSidebarItem, reloadData]);

  const keyboardActions = useKeyboardActions({
    settingsActions, moveActions, multiSelectActions, editActions, dueDateActions, durationActions,
    selectedTaskIndex, toggleTaskCompleted, createList, createTask, deleteTask,
    handleArrowNavigation, handleHorizontalArrow, undo, redo,
    handleRestoreTask: trashActions.handleRestoreTask, focusedPane, openSearch, handleStartNotesEdit,
    indentTask, outdentTask, toggleCollapse, toggleFolderCollapse, deleteList, togglePalette,
    duplicateTask, copyTasks, cycleSidebarNext, cycleSidebarPrev,
    startMoveList, handleMoveListKeyDown,
    indentList, outdentList,
    showListInfo, closeListInfo, selectSidebarByListNumber,
    toggleLocalSearch: () => setLocalSearchOpen(!localSearchOpen),
  });

  const keyboardState = useKeyboardState({
    editMode, dueDateIndex, durationIndex, notesEditing, moveMode, focusedPane, shiftHeld, cmdHeld,
    selectedTaskIndicesSize: selectedTaskIndices.size, selectedSidebarItem, isTrashView, selectedTask, isSearchOpen, isPaletteOpen, settingsOpen, isCompletedView,
    confirmationDialogOpen: trashActions.confirmationDialog !== null || listConfirmationDialog !== null,
    moveListMode, listInfoOpen,
  });

  useKeyboardNavigation(keyboardActions, keyboardState, setSelectedTaskIndex);

  const dragDrop = useDragDrop({
    hardcoreMode, getTaskAtIndex, getAdjacentSibling,
    selectedTaskIndices, sidebarItems,
    reloadTasks, reloadData, setSelectedSidebarIndex, setFocusedPane, setSelectedTaskIndex, flatTasks,
    flash, moveFlash, undoPush,
    multiSelectClear: multiSelectActions.clear,
  });

  const handleSidebarClick = useCallback((index: number) => { if (hardcoreMode) return; setSelectedSidebarIndex(index); setFocusedPane('lists'); }, [hardcoreMode]);
  const handleTaskClick = useCallback((index: number) => { if (hardcoreMode) return; setSelectedTaskIndex(index); setFocusedPane('tasks'); multiSelectActions.clear(); }, [hardcoreMode, multiSelectActions]);
  const handleTaskToggle = useCallback(async (taskId: string) => { await window.api.tasksToggleCompleted(taskId); await reloadTasks(); }, [reloadTasks]);
  const handleToggleExpand = useCallback(async (taskId: string) => { if (hardcoreMode) return; await window.api.tasksToggleExpanded(taskId); await reloadTasks(); }, [hardcoreMode, reloadTasks]);
  const handleFolderToggle = useCallback(async (folderId: string) => { if (hardcoreMode) return; await window.api.foldersToggleExpanded(folderId); await reloadData(); }, [hardcoreMode, reloadData]);

  const ctxMenu = useContextMenu({
    hardcoreMode, tasks, sidebarItems, setSelectedTaskIndex, setSelectedSidebarIndex, setFocusedPane,
    editActions, moveActions, dueDateActions, toggleTaskCompleted, deleteTask, deleteList, duplicateTask,
    duplicateList, startMoveList, showListInfo,
  });

  const getSelectedListName = (): string => selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list.name : selectedSidebarItem?.type === 'smart' ? selectedSidebarItem.smartList.name : selectedSidebarItem?.type === 'folder' ? selectedSidebarItem.folder.name : 'Tasks';
  const getMoveTargetName = (): string => { const item = sidebarItems[moveTargetIndex]; return item?.type === 'list' ? item.list.name : ''; };

  return {
    sidebarItems, selectedSidebarIndex, focusedPane, moveMode, moveTargetIndex, editMode, editValue, setEditValue, setEditMode,
    handleInputKeyDown: editActions.handleInputKeyDown, handleEditBlur: editActions.commit, inputRef, taskCounts, tasks, selectedTaskIndex,
    selectedTaskIndices, shiftHeld, cmdHeld, boundaryCursor, settingsOpen, settingsThemeIndex, settingsCategory, themes, hardcoreMode,
    trashRetentionIndex, retentionOptions, getSelectedListName, getMoveTargetName, handleSidebarClick, handleTaskClick, handleTaskToggle,
    handleFolderToggle, handleToggleExpand, handleTaskContextMenu: ctxMenu.handleTaskContextMenu, handleSidebarContextMenu: ctxMenu.handleSidebarContextMenu,
    contextMenu: ctxMenu.contextMenu, closeContextMenu: ctxMenu.closeContextMenu, flashIds, throbIds, completeIds, uncompleteIds, moveIds,
    evaporateIds, flatTasks: filteredFlatTasks, listNames, isCompletedView, showSourceList, dueDateIndex, commitDueDate: dueDateActions.commit, cancelDueDate: dueDateActions.cancel,
    durationIndex, commitDuration: durationActions.commit, cancelDuration: durationActions.cancel, trashIndex, isTrashView, lists,
    confirmationDialog: trashActions.confirmationDialog || listConfirmationDialog,
    closeConfirmationDialog: trashActions.confirmationDialog ? trashActions.closeConfirmationDialog : closeListConfirmation,
    completedFilter: isCompletedView ? completedFilter : undefined, onFilterChange: isCompletedView ? setCompletedFilter : undefined,
    listsWithCompletedTasks: isCompletedView ? listsWithCompletedTasks : undefined, selectedTask, handleDetailEditTitle, handleDetailEditDueDate, handleDetailEditDuration,
    isSearchOpen, lastSearchQuery, closeSearch, handleSearchSelect, setLastSearchQuery, notesEditing, handleStartNotesEdit, handleNotesCommit,
    handleNotesCancelEdit, dragState: dragDrop.state, taskDragProps: dragDrop.taskDragProps, sidebarDropProps: dragDrop.sidebarDropProps, headerDropProps: dragDrop.headerDropProps,
    isPaletteOpen, togglePalette, closePalette, paletteContext, executePaletteAction, moveListMode, getMoveListTargetName, moveListTargets,
    moveListTargetIndex, closeListInfo, listInfoOpen, handleListNotesChange, selectedSidebarItem, metaHeld,
    folderViewRows: folderView.rows, folderViewToggleSection: folderView.toggleSection,
    toastMessage: toast.message, localSearchOpen, setLocalSearchOpen, localSearchQuery, setLocalSearchQuery,
  };
}
