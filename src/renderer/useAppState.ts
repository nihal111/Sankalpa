import { useEffect, useState, useCallback } from 'react';
import { useMultiSelect } from './useMultiSelect';
import type { Pane } from './types';
import { buildSidebarItems } from './utils/buildSidebarItems';
import { useSettingsState } from './hooks/useSettingsState';
import { useMoveState } from './hooks/useMoveState';
import { useEditState } from './hooks/useEditState';
import { useSidebarNavigation } from './hooks/useSidebarNavigation';
import { useTaskActions } from './hooks/useTaskActions';
import { useArrowNavigation } from './hooks/useArrowNavigation';
import { useDataState } from './hooks/useDataState';

export function useAppState() {
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedSidebarIndex, setSelectedSidebarIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [multiSelect, multiSelectActions] = useMultiSelect();
  const { selectedIndices: selectedTaskIndices, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld } = multiSelect;
  const [settings, settingsActions] = useSettingsState();
  const { settingsOpen, settingsThemeIndex, themes } = settings;

  const [data, dataActions] = useDataState(selectedSidebarIndex, setSelectedTaskIndex);
  const { tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId } = data;
  const { reloadData, reloadTasks, setTasks, setFolders, setLists } = dataActions;

  const handleMoveCommit = useCallback(async (targetListId: string, taskIds: string[]) => {
    for (const taskId of taskIds) {
      await window.api.tasksMove(taskId, targetListId);
    }
    multiSelectActions.clear();
    const newIndex = sidebarItems.findIndex((item) => item.type === 'list' && item.list.id === targetListId);
    if (newIndex >= 0) setSelectedSidebarIndex(newIndex);
    setFocusedPane('lists');
    await reloadData();
  }, [sidebarItems, multiSelectActions, reloadData]);

  const [move, moveActions] = useMoveState({
    sidebarItems,
    selectedListId,
    tasks,
    selectedTaskIndex,
    selectedTaskIndices,
    onCommit: handleMoveCommit,
  });
  const { moveMode, moveTargetIndex } = move;

  const [edit, editActions, editSetters] = useEditState({
    focusedPane, selectedSidebarItem, selectedTaskIndex, tasks, reloadData, reloadTasks,
  });
  const { editMode, editValue, inputRef } = edit;
  const { setEditMode, setEditValue } = editSetters;

  useEffect(() => {
    return window.api.onQuickAdd(async () => {
      // Navigate to smart Inbox
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

  const { createTask, deleteTask, handleReorder } = useTaskActions({
    focusedPane, selectedSidebarItem, selectedListId, selectedTaskIndex, tasks,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks,
  });

  const createList = useCallback(async () => {
    const id = crypto.randomUUID();
    const folderId = selectedSidebarItem?.type === 'folder' ? selectedSidebarItem.folder.id : undefined;
    const newList = await window.api.listsCreate(id, '', folderId);
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
    const rebuilt = buildSidebarItems(f, l);
    const newIndex = rebuilt.findIndex((item) => item.type === 'list' && item.list.id === newList.id);
    setSelectedSidebarIndex(newIndex >= 0 ? newIndex : selectedSidebarIndex);
    setFocusedPane('lists');
    setEditMode({ type: 'list', id: newList.id });
    setEditValue('');
  }, [selectedSidebarItem, selectedSidebarIndex, setEditMode, setEditValue, setFolders, setLists]);

  const handleArrowNavigation = useArrowNavigation({
    focusedPane, sidebarItemsLength: sidebarItems.length, tasksLength: tasks.length,
    selectedTaskIndex, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld,
    selectedTaskIndicesSize: selectedTaskIndices.size,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn),
    setSelectedTaskIndex, multiSelectActions, handleReorder,
  });

  const { handleHorizontalArrow } = useSidebarNavigation({
    focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems,
    setSelectedSidebarIndex: (fn) => setSelectedSidebarIndex(fn),
    setFocusedPane, reloadData,
  });

  const startMove = useCallback(() => {
    if (focusedPane === 'tasks') moveActions.start();
  }, [focusedPane, moveActions]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.metaKey && e.key === ',') {
      e.preventDefault();
      settingsActions.open();
      return;
    }
    if (settingsActions.handleKeyDown(e)) return;
    if (e.key === 'Shift' && focusedPane === 'tasks' && !editMode && !moveMode) {
      if (!shiftHeld) multiSelectActions.handleShiftDown(selectedTaskIndex);
      return;
    }
    if (e.key === 'Meta' && focusedPane === 'tasks' && !editMode && !moveMode) {
      if (!cmdHeld) multiSelectActions.handleCmdDown(selectedTaskIndex);
      return;
    }
    if (editMode) {
      if (e.key === 'Escape') { e.preventDefault(); editActions.cancel(); }
      return;
    }
    if (moveActions.handleKeyDown(e)) return;
    if (e.key === 'Escape' && selectedTaskIndices.size > 0) { e.preventDefault(); multiSelectActions.clear(); return; }
    if (cmdHeld && e.key === 'Enter') { e.preventDefault(); multiSelectActions.toggleAtCursor(selectedTaskIndex); return; }
    if (e.key === ' ' && !cmdHeld && focusedPane === 'tasks') { e.preventDefault(); multiSelectActions.clear(); return; }
    if (e.metaKey && e.key === 'n') { e.preventDefault(); if (e.shiftKey) createList(); else createTask(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteTask(); return; }
    if (e.key === 'Tab') { e.preventDefault(); if (selectedTaskIndices.size > 0) multiSelectActions.clear(); setFocusedPane((p) => (p === 'lists' ? 'tasks' : 'lists')); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); handleArrowNavigation(e); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); handleHorizontalArrow(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (selectedTaskIndices.size > 0) return; if (selectedSidebarItem?.type === 'smart') return; editActions.start(); return; }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); startMove(); return; }
  }, [editMode, moveMode, focusedPane, selectedTaskIndices.size, handleArrowNavigation, handleHorizontalArrow, editActions, startMove, createList, createTask, deleteTask, shiftHeld, cmdHeld, selectedTaskIndex, multiSelectActions, settingsActions, moveActions, selectedSidebarItem]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') { multiSelectActions.handleShiftUp(); return; }
    if (e.key === 'Meta') {
      const cursor = multiSelectActions.handleCmdUp();
      if (cursor !== null) setSelectedTaskIndex(cursor);
      return;
    }
  }, [multiSelectActions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const getSelectedListName = (): string => {
    if (selectedSidebarItem?.type === 'list') return selectedSidebarItem.list.name;
    if (selectedSidebarItem?.type === 'smart') return selectedSidebarItem.smartList.name;
    return 'Tasks';
  };

  const getMoveTargetName = (): string => {
    const item = sidebarItems[moveTargetIndex];
    return item?.type === 'list' ? item.list.name : '';
  };

  return {
    sidebarItems,
    selectedSidebarIndex,
    focusedPane,
    moveMode,
    moveTargetIndex,
    editMode,
    editValue,
    setEditValue,
    setEditMode,
    handleInputKeyDown: editActions.handleInputKeyDown,
    inputRef,
    taskCounts,
    tasks,
    selectedTaskIndex,
    selectedTaskIndices,
    shiftHeld,
    cmdHeld,
    boundaryCursor,
    settingsOpen,
    settingsThemeIndex,
    themes,
    getSelectedListName,
    getMoveTargetName,
  };
}
