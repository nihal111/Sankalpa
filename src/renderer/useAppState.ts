import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useKeyboardNavigation, KeyboardActions, KeyboardState } from './hooks/useKeyboardNavigation';

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

  const switchPane = useCallback(() => {
    setFocusedPane((p) => (p === 'lists' ? 'tasks' : 'lists'));
  }, []);

  const keyboardActions: KeyboardActions = useMemo(() => ({
    openSettings: settingsActions.open,
    handleSettingsKeyDown: settingsActions.handleKeyDown,
    handleMoveKeyDown: moveActions.handleKeyDown,
    handleShiftDown: () => multiSelectActions.handleShiftDown(selectedTaskIndex),
    handleShiftUp: multiSelectActions.handleShiftUp,
    handleCmdDown: () => multiSelectActions.handleCmdDown(selectedTaskIndex),
    handleCmdUp: multiSelectActions.handleCmdUp,
    cancelEdit: editActions.cancel,
    clearSelection: multiSelectActions.clear,
    toggleAtCursor: () => multiSelectActions.toggleAtCursor(selectedTaskIndex),
    createList, createTask, deleteTask, switchPane,
    handleArrowNavigation, handleHorizontalArrow,
    startEdit: editActions.start,
    startMove,
  }), [settingsActions, moveActions, multiSelectActions, selectedTaskIndex, editActions, createList, createTask, deleteTask, switchPane, handleArrowNavigation, handleHorizontalArrow, startMove]);

  const keyboardState: KeyboardState = useMemo(() => ({
    editMode, moveMode, focusedPane, shiftHeld, cmdHeld,
    hasSelection: selectedTaskIndices.size > 0,
    canEdit: selectedSidebarItem?.type !== 'smart',
  }), [editMode, moveMode, focusedPane, shiftHeld, cmdHeld, selectedTaskIndices.size, selectedSidebarItem?.type]);

  useKeyboardNavigation(keyboardActions, keyboardState, setSelectedTaskIndex);

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
