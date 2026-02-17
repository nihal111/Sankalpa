import { useEffect, useState, useCallback, useRef } from 'react';
import type { Folder, List, Task } from '../shared/types';
import { useMultiSelect } from './useMultiSelect';
import type { Pane, EditMode, Theme, SidebarItem } from './types';
import { SMART_LISTS } from './types';

const THEMES: Theme[] = ['light', 'dark', 'system'];

export function useAppState() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedSidebarIndex, setSelectedSidebarIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState('');
  const [moveMode, setMoveMode] = useState(false);
  const [moveTargetIndex, setMoveTargetIndex] = useState(0);
  const [multiSelect, multiSelectActions] = useMultiSelect();
  const { selectedIndices: selectedTaskIndices, selectionAnchor, boundaryCursor, shiftHeld, cmdHeld } = multiSelect;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [settingsThemeIndex, setSettingsThemeIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build sidebar items list
  const sidebarItems: SidebarItem[] = [];
  SMART_LISTS.forEach((sl) => sidebarItems.push({ type: 'smart', smartList: sl }));
  folders.forEach((folder) => {
    sidebarItems.push({ type: 'folder', folder });
    if (folder.is_expanded) {
      lists.filter((l) => l.folder_id === folder.id).forEach((list) => {
        sidebarItems.push({ type: 'list', list });
      });
    }
  });
  lists.filter((l) => l.folder_id === null).forEach((list) => {
    sidebarItems.push({ type: 'list', list });
  });

  const selectedSidebarItem = sidebarItems[selectedSidebarIndex];
  const selectedListId = selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list.id
    : selectedSidebarItem?.type === 'smart' ? selectedSidebarItem.smartList.id
    : null;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]).then(([f, l]) => {
      setFolders(f);
      setLists(l);
    });
  }, []);

  useEffect(() => {
    const loadCounts = async (): Promise<void> => {
      const counts: Record<string, number> = {};
      for (const list of lists) {
        counts[list.id] = await window.api.listsGetTaskCount(list.id);
      }
      setTaskCounts(counts);
    };
    loadCounts();
  }, [lists, tasks.length]);

  useEffect(() => {
    if (selectedListId && selectedSidebarItem?.type === 'list') {
      window.api.tasksGetByList(selectedListId).then((t) => {
        setTasks(t);
        setSelectedTaskIndex(0);
      });
    } else {
      setTasks([]);
    }
  }, [selectedListId, selectedSidebarItem?.type]);

  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (editMode) {
      // Input not yet rendered, retry after DOM update
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editMode]);

  const reloadData = useCallback(async () => {
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
  }, []);

  const reloadTasks = useCallback(async () => {
    if (selectedListId && selectedSidebarItem?.type === 'list') {
      const newTasks = await window.api.tasksGetByList(selectedListId);
      setTasks(newTasks);
    }
  }, [selectedListId, selectedSidebarItem?.type]);

  const handleReorder = useCallback(async (direction: -1 | 1) => {
    if (focusedPane === 'tasks') {
      const newIndex = selectedTaskIndex + direction;
      if (newIndex < 0 || newIndex >= tasks.length) return;
      const item = tasks[selectedTaskIndex];
      const neighbor = tasks[newIndex];
      await window.api.tasksReorder(item.id, neighbor.sort_key);
      await window.api.tasksReorder(neighbor.id, item.sort_key);
      await reloadTasks();
      setSelectedTaskIndex(newIndex);
    }
  }, [focusedPane, selectedTaskIndex, tasks, reloadTasks]);

  const startEdit = useCallback(() => {
    const item = selectedSidebarItem;
    if (focusedPane === 'lists' && item?.type === 'list') {
      setEditMode({ type: 'list', id: item.list.id });
      setEditValue(item.list.name);
    } else if (focusedPane === 'lists' && item?.type === 'folder') {
      setEditMode({ type: 'folder', id: item.folder.id });
      setEditValue(item.folder.name);
    } else if (focusedPane === 'tasks' && tasks[selectedTaskIndex]) {
      setEditMode({ type: 'task', index: selectedTaskIndex });
      setEditValue(tasks[selectedTaskIndex].title);
    }
  }, [focusedPane, selectedSidebarItem, selectedTaskIndex, tasks]);

  const commitEdit = useCallback(async () => {
    if (!editMode || !editValue.trim()) {
      setEditMode(null);
      return;
    }
    if (editMode.type === 'list') {
      await window.api.listsUpdate(editMode.id, editValue.trim());
      await reloadData();
    } else if (editMode.type === 'folder') {
      await window.api.foldersUpdate(editMode.id, editValue.trim());
      await reloadData();
    } else {
      await window.api.tasksUpdate(tasks[editMode.index].id, editValue.trim());
      await reloadTasks();
    }
    setEditMode(null);
  }, [editMode, editValue, tasks, reloadData, reloadTasks]);

  const createList = useCallback(async () => {
    const id = crypto.randomUUID();
    const folderId = selectedSidebarItem?.type === 'folder' ? selectedSidebarItem.folder.id : undefined;
    const newList = await window.api.listsCreate(id, '', folderId);
    await reloadData();
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    const rebuilt: SidebarItem[] = [];
    SMART_LISTS.forEach((sl) => rebuilt.push({ type: 'smart', smartList: sl }));
    f.forEach((folder) => {
      rebuilt.push({ type: 'folder', folder });
      if (folder.is_expanded) {
        l.filter((li) => li.folder_id === folder.id).forEach((list) => rebuilt.push({ type: 'list', list }));
      }
    });
    l.filter((li) => li.folder_id === null).forEach((list) => rebuilt.push({ type: 'list', list }));
    const newIndex = rebuilt.findIndex((item) => item.type === 'list' && item.list.id === newList.id);
    setSelectedSidebarIndex(newIndex >= 0 ? newIndex : selectedSidebarIndex);
    setFocusedPane('lists');
    setEditMode({ type: 'list', id: newList.id });
    setEditValue('');
  }, [selectedSidebarItem, reloadData, selectedSidebarIndex]);

  const createTask = useCallback(async () => {
    if (!selectedListId || selectedSidebarItem?.type !== 'list') return;
    const id = crypto.randomUUID();
    const newTask = await window.api.tasksCreate(id, selectedListId, '');
    const newTasks = await window.api.tasksGetByList(selectedListId);
    const newIndex = newTasks.findIndex((t) => t.id === newTask.id);
    setTasks(newTasks);
    setSelectedTaskIndex(newIndex);
    setFocusedPane('tasks');
    setEditMode({ type: 'task', index: newIndex });
    setEditValue('');
  }, [selectedListId, selectedSidebarItem?.type]);

  const deleteTask = useCallback(async () => {
    if (focusedPane !== 'tasks' || tasks.length === 0) return;
    const task = tasks[selectedTaskIndex];
    if (!task) return;
    await window.api.tasksDelete(task.id);
    await reloadTasks();
    setSelectedTaskIndex((i) => Math.min(i, tasks.length - 2));
  }, [focusedPane, tasks, selectedTaskIndex, reloadTasks]);

  const startMove = useCallback(() => {
    if (focusedPane === 'tasks' && (tasks[selectedTaskIndex] || selectedTaskIndices.size > 0)) {
      setMoveMode(true);
      const listIndex = sidebarItems.findIndex((item) => item.type === 'list');
      setMoveTargetIndex(Math.max(0, listIndex));
    }
  }, [focusedPane, tasks, selectedTaskIndex, selectedTaskIndices.size, sidebarItems]);

  const commitMove = useCallback(async () => {
    const targetItem = sidebarItems[moveTargetIndex];
    if (targetItem?.type !== 'list' || targetItem.list.id === selectedListId) {
      setMoveMode(false);
      return;
    }
    const indicesToMove = selectedTaskIndices.size > 0
      ? Array.from(selectedTaskIndices).sort((a, b) => a - b)
      : [selectedTaskIndex];
    for (const idx of indicesToMove) {
      const task = tasks[idx];
      if (task) {
        await window.api.tasksMove(task.id, targetItem.list.id);
      }
    }
    multiSelectActions.clear();
    setSelectedSidebarIndex(moveTargetIndex);
    setFocusedPane('lists');
    setMoveMode(false);
    await reloadData();
  }, [tasks, selectedTaskIndex, sidebarItems, moveTargetIndex, selectedListId, selectedTaskIndices, multiSelectActions, reloadData]);

  const handleArrowNavigation = useCallback((e: KeyboardEvent) => {
    const delta = e.key === 'ArrowUp' ? -1 : 1;
    if (e.metaKey && e.shiftKey && focusedPane === 'tasks') {
      if (selectedTaskIndices.size > 0) multiSelectActions.clear();
      handleReorder(delta);
      return;
    }
    if (focusedPane === 'lists') {
      setSelectedSidebarIndex((i) => Math.max(0, Math.min(sidebarItems.length - 1, i + delta)));
      return;
    }
    if (cmdHeld) {
      multiSelectActions.moveBoundaryCursor(Math.max(0, Math.min(tasks.length - 1, (boundaryCursor ?? selectedTaskIndex) + delta)));
      return;
    }
    if (shiftHeld && selectionAnchor !== null) {
      const newIndex = Math.max(0, Math.min(tasks.length - 1, selectedTaskIndex + delta));
      setSelectedTaskIndex(newIndex);
      multiSelectActions.extendSelection(selectionAnchor, newIndex);
      return;
    }
    if (selectedTaskIndices.size > 0) multiSelectActions.clear();
    setSelectedTaskIndex((i) => Math.max(0, Math.min(tasks.length - 1, i + delta)));
  }, [focusedPane, sidebarItems.length, tasks.length, selectedTaskIndex, selectionAnchor, shiftHeld, cmdHeld, selectedTaskIndices.size, handleReorder, multiSelectActions, boundaryCursor]);

  const handleHorizontalArrow = useCallback(async (direction: 'left' | 'right') => {
    if (focusedPane === 'tasks') {
      if (direction === 'left') setFocusedPane('lists');
      return;
    }
    const item = selectedSidebarItem;
    if (direction === 'right') {
      if (item?.type === 'folder') {
        if (!item.folder.is_expanded) {
          await window.api.foldersToggleExpanded(item.folder.id);
          await reloadData();
        } else {
          const childIndex = sidebarItems.findIndex(
            (si, idx) => idx > selectedSidebarIndex && si.type === 'list' && si.list.folder_id === item.folder.id
          );
          if (childIndex >= 0) setSelectedSidebarIndex(childIndex);
        }
      } else {
        setFocusedPane('tasks');
      }
    } else {
      if (item?.type === 'folder' && item.folder.is_expanded) {
        await window.api.foldersToggleExpanded(item.folder.id);
        await reloadData();
      } else if (item?.type === 'list' && item.list.folder_id) {
        const parentIndex = sidebarItems.findIndex(
          (si) => si.type === 'folder' && si.folder.id === item.list.folder_id
        );
        if (parentIndex >= 0) setSelectedSidebarIndex(parentIndex);
      }
    }
  }, [focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems, reloadData]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.metaKey && e.key === ',') {
      e.preventDefault();
      setSettingsOpen(true);
      setSettingsThemeIndex(THEMES.indexOf(theme));
      return;
    }
    if (settingsOpen) {
      if (e.key === 'Escape') { e.preventDefault(); setSettingsOpen(false); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSettingsThemeIndex((i) => Math.max(0, i - 1)); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSettingsThemeIndex((i) => Math.min(THEMES.length - 1, i + 1)); return; }
      if (e.key === 'Enter') { e.preventDefault(); setTheme(THEMES[settingsThemeIndex]); setSettingsOpen(false); return; }
      return;
    }
    if (e.key === 'Shift' && focusedPane === 'tasks' && !editMode && !moveMode) {
      if (!shiftHeld) multiSelectActions.handleShiftDown(selectedTaskIndex);
      return;
    }
    if (e.key === 'Meta' && focusedPane === 'tasks' && !editMode && !moveMode) {
      if (!cmdHeld) multiSelectActions.handleCmdDown(selectedTaskIndex);
      return;
    }
    if (editMode) {
      if (e.key === 'Escape') { e.preventDefault(); setEditMode(null); }
      return;
    }
    if (moveMode) {
      if (e.key === 'Escape') { e.preventDefault(); setMoveMode(false); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const delta = e.key === 'ArrowUp' ? -1 : 1;
        let newIndex = moveTargetIndex + delta;
        while (newIndex >= 0 && newIndex < sidebarItems.length && sidebarItems[newIndex]?.type !== 'list') {
          newIndex += delta;
        }
        if (newIndex >= 0 && newIndex < sidebarItems.length && sidebarItems[newIndex]?.type === 'list') {
          setMoveTargetIndex(newIndex);
        }
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); commitMove(); return; }
      return;
    }
    if (e.key === 'Escape' && selectedTaskIndices.size > 0) { e.preventDefault(); multiSelectActions.clear(); return; }
    if (cmdHeld && e.key === 'Enter') { e.preventDefault(); multiSelectActions.toggleAtCursor(selectedTaskIndex); return; }
    if (e.key === ' ' && !cmdHeld && focusedPane === 'tasks') { e.preventDefault(); multiSelectActions.clear(); return; }
    if (e.metaKey && e.key === 'n') { e.preventDefault(); if (e.shiftKey) createList(); else createTask(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteTask(); return; }
    if (e.key === 'Tab') { e.preventDefault(); if (selectedTaskIndices.size > 0) multiSelectActions.clear(); setFocusedPane((p) => (p === 'lists' ? 'tasks' : 'lists')); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); handleArrowNavigation(e); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); handleHorizontalArrow(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (selectedTaskIndices.size > 0) return; if (selectedSidebarItem?.type === 'smart') return; startEdit(); return; }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); startMove(); return; }
  }, [editMode, moveMode, focusedPane, sidebarItems.length, moveTargetIndex, selectedTaskIndices.size, handleArrowNavigation, handleHorizontalArrow, startEdit, startMove, commitMove, createList, createTask, deleteTask, shiftHeld, cmdHeld, selectedTaskIndex, multiSelectActions, settingsOpen, settingsThemeIndex, theme, selectedSidebarItem, sidebarItems]);

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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
  };

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
    handleInputKeyDown,
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
    themes: THEMES,
    getSelectedListName,
    getMoveTargetName,
  };
}
