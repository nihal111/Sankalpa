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
import { useFlash } from './hooks/useFlash';
import { useUndoStack } from './hooks/useUndoStack';

export function useAppState() {
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedSidebarIndex, setSelectedSidebarIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [dueDateIndex, setDueDateIndex] = useState<number | null>(null);
  const [multiSelect, multiSelectActions] = useMultiSelect();
  const { selectedIndices: selectedTaskIndices, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld } = multiSelect;
  const [settings, settingsActions] = useSettingsState();
  const { settingsOpen, settingsThemeIndex, themes, hardcoreMode, settingsCategory } = settings;
  const { flashIds, flash } = useFlash();

  const [data, dataActions] = useDataState(selectedSidebarIndex, setSelectedTaskIndex);
  const { lists, tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId } = data;
  const { reloadData, reloadTasks, setTasks, setFolders, setLists } = dataActions;

  const listNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of lists) map[l.id] = l.name;
    return map;
  }, [lists]);

  const isCompletedView = selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed';

  const afterUndo = useCallback(async () => {
    await reloadData();
    await reloadTasks();
  }, [reloadData, reloadTasks]);
  const { push: undoPush, undo, redo } = useUndoStack(afterUndo);

  const handleMoveCommit = useCallback(async (targetListId: string, taskIds: string[]) => {
    const originals = taskIds.map((id) => {
      const t = tasks.find((task) => task.id === id);
      return { id, listId: t?.list_id ?? null, sortKey: t?.sort_key ?? 0 };
    });
    for (const taskId of taskIds) {
      await window.api.tasksMove(taskId, targetListId);
    }
    undoPush({ undo: async () => {
      for (const orig of originals) {
        if (orig.listId !== null) {
          await window.api.tasksMove(orig.id, orig.listId);
        } else {
          await window.api.tasksSetListId(orig.id, null);
        }
        await window.api.tasksReorder(orig.id, orig.sortKey);
      }
    }, redo: async () => {
      for (const taskId of taskIds) {
        await window.api.tasksMove(taskId, targetListId);
      }
    } });
    taskIds.forEach(flash);
    multiSelectActions.clear();
    const newIndex = sidebarItems.findIndex((item) => item.type === 'list' && item.list.id === targetListId);
    if (newIndex >= 0) setSelectedSidebarIndex(newIndex);
    setFocusedPane('lists');
    await reloadData();
  }, [sidebarItems, multiSelectActions, reloadData, flash, tasks, undoPush]);

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
    focusedPane, selectedSidebarItem, selectedTaskIndex, tasks, reloadData, reloadTasks, undoPush,
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

  const { createTask, toggleTaskCompleted, deleteTask, handleReorder } = useTaskActions({
    focusedPane, selectedSidebarItem, selectedListId, selectedTaskIndex, tasks,
    setTasks, setSelectedTaskIndex, setFocusedPane, setEditMode, setEditValue, reloadTasks, onFlash: flash, undoPush,
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
    flash(newList.id);
    undoPush({ undo: async () => { await window.api.listsDelete(newList.id); }, redo: async () => { await window.api.listsRestore(newList.id, newList.folder_id, '', newList.sort_key, newList.created_at, newList.updated_at); } });
  }, [selectedSidebarItem, selectedSidebarIndex, setEditMode, setEditValue, setFolders, setLists, flash, undoPush]);

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

  const startDueDate = useCallback(() => {
    if (focusedPane === 'tasks' && tasks[selectedTaskIndex]) setDueDateIndex(selectedTaskIndex);
  }, [focusedPane, tasks, selectedTaskIndex]);

  const commitDueDate = useCallback(async (value: string) => {
    const task = tasks[dueDateIndex!];
    const dueDate = value ? new Date(value).getTime() : null;
    await window.api.tasksSetDueDate(task.id, dueDate);
    setDueDateIndex(null);
    await reloadTasks();
  }, [dueDateIndex, tasks, reloadTasks]);

  const cancelDueDate = useCallback(() => setDueDateIndex(null), []);

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
    cancelEdit: () => { editActions.cancel(); cancelDueDate(); },
    clearSelection: multiSelectActions.clear,
    toggleAtCursor: () => multiSelectActions.toggleAtCursor(selectedTaskIndex),
    toggleTaskCompleted,
    createList, createTask, deleteTask, switchPane,
    handleArrowNavigation, handleHorizontalArrow,
    startEdit: editActions.start,
    startMove,
    startDueDate,
    undo,
    redo,
  }), [settingsActions, moveActions, multiSelectActions, selectedTaskIndex, editActions, cancelDueDate, toggleTaskCompleted, createList, createTask, deleteTask, switchPane, handleArrowNavigation, handleHorizontalArrow, startMove, startDueDate, undo, redo]);

  const keyboardState: KeyboardState = useMemo(() => ({
    editMode: editMode || dueDateIndex !== null, moveMode, focusedPane, shiftHeld, cmdHeld,
    hasSelection: selectedTaskIndices.size > 0,
    canEdit: selectedSidebarItem?.type !== 'smart',
  }), [editMode, dueDateIndex, moveMode, focusedPane, shiftHeld, cmdHeld, selectedTaskIndices.size, selectedSidebarItem?.type]);

  useKeyboardNavigation(keyboardActions, keyboardState, setSelectedTaskIndex);

  const handleSidebarClick = useCallback((index: number) => {
    if (hardcoreMode) return;
    setSelectedSidebarIndex(index);
    setFocusedPane('lists');
  }, [hardcoreMode]);

  const handleTaskClick = useCallback((index: number) => {
    if (hardcoreMode) return;
    setSelectedTaskIndex(index);
    setFocusedPane('tasks');
    multiSelectActions.clear();
  }, [hardcoreMode, multiSelectActions]);


  const handleTaskToggle = useCallback(async (taskId: string) => {
    await window.api.tasksToggleCompleted(taskId);
    await reloadTasks();
  }, [reloadTasks]);

  const handleFolderToggle = useCallback(async (folderId: string) => {
    if (hardcoreMode) return;
    await window.api.foldersToggleExpanded(folderId);
    await reloadData();
  }, [hardcoreMode, reloadData]);

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
    settingsCategory,
    themes,
    hardcoreMode,
    getSelectedListName,
    getMoveTargetName,
    handleSidebarClick,
    handleTaskClick,
    handleTaskToggle,
    handleFolderToggle,
    flashIds,
    listNames,
    isCompletedView,
    dueDateIndex,
    commitDueDate,
    cancelDueDate,
  };
}
