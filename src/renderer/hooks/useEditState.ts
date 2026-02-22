import { useRef, useState, useCallback, useEffect } from 'react';
import type { EditMode, Pane } from '../types';
import type { Task } from '../../shared/types';
import type { UndoEntry } from './useUndoStack';

interface SidebarItem {
  type: 'smart' | 'folder' | 'list';
  list?: { id: string; name: string };
  folder?: { id: string; name: string };
}

interface UseEditStateParams {
  focusedPane: Pane;
  selectedSidebarItem: SidebarItem | undefined;
  selectedTaskIndex: number;
  tasks: Task[];
  reloadData: () => Promise<void>;
  reloadTasks: () => Promise<void>;
  undoPush: (entry: UndoEntry) => void;
  onEvaporate?: (id: string) => void;
}

interface EditActions {
  start: () => void;
  commit: () => Promise<void>;
  cancel: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useEditState(params: UseEditStateParams): [
  { editMode: EditMode; editValue: string; inputRef: React.RefObject<HTMLInputElement | null> },
  EditActions,
  { setEditMode: (mode: EditMode) => void; setEditValue: (value: string) => void }
] {
  const { focusedPane, selectedSidebarItem, selectedTaskIndex, tasks, reloadData, reloadTasks, undoPush, onEvaporate } = params;
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef<string>('');

  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (editMode) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editMode]);

  // Sync prevValueRef whenever edit mode is entered (covers both start() and direct setEditMode)
  useEffect(() => {
    if (!editMode) { prevValueRef.current = ''; return; }
    if (editMode.type === 'task' && tasks[editMode.index]) {
      prevValueRef.current = tasks[editMode.index].title;
    } else if (editMode.type === 'list' && selectedSidebarItem?.type === 'list') {
      prevValueRef.current = selectedSidebarItem.list!.name;
    } else if (editMode.type === 'folder' && selectedSidebarItem?.type === 'folder') {
      prevValueRef.current = selectedSidebarItem.folder!.name;
    }
  }, [editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    const item = selectedSidebarItem;
    if (focusedPane === 'lists' && item?.type === 'list') {
      prevValueRef.current = item.list!.name;
      setEditMode({ type: 'list', id: item.list!.id });
      setEditValue(item.list!.name);
    } else if (focusedPane === 'lists' && item?.type === 'folder') {
      prevValueRef.current = item.folder!.name;
      setEditMode({ type: 'folder', id: item.folder!.id });
      setEditValue(item.folder!.name);
    } else if (focusedPane === 'tasks' && tasks[selectedTaskIndex]) {
      prevValueRef.current = tasks[selectedTaskIndex].title;
      setEditMode({ type: 'task', index: selectedTaskIndex });
      setEditValue(tasks[selectedTaskIndex].title);
    }
  }, [focusedPane, selectedSidebarItem, selectedTaskIndex, tasks]);

  const commit = useCallback(async () => {
    if (!editMode) { setEditMode(null); return; }
    const oldValue = prevValueRef.current;
    const newValue = editValue.trim();
    if (!newValue) {
      // Empty title: if this was a new task (previously empty), delete it
      if (editMode.type === 'task' && oldValue === '' && tasks[editMode.index]) {
        const taskId = tasks[editMode.index].id;
        onEvaporate?.(taskId);
        setTimeout(async () => {
          await window.api.tasksDelete(taskId);
          await reloadTasks();
        }, 200);
      }
      setEditMode(null);
      return;
    }
    if (editMode.type === 'list') {
      const id = editMode.id;
      await window.api.listsUpdate(id, newValue);
      if (oldValue != null && oldValue !== newValue) {
        undoPush({ undo: async () => { await window.api.listsUpdate(id, oldValue); }, redo: async () => { await window.api.listsUpdate(id, newValue); } });
      }
      await reloadData();
    } else if (editMode.type === 'folder') {
      const id = editMode.id;
      await window.api.foldersUpdate(id, newValue);
      if (oldValue != null && oldValue !== newValue) {
        undoPush({ undo: async () => { await window.api.foldersUpdate(id, oldValue); }, redo: async () => { await window.api.foldersUpdate(id, newValue); } });
      }
      await reloadData();
    } else {
      const taskId = tasks[editMode.index].id;
      await window.api.tasksUpdate(taskId, newValue);
      if (oldValue != null && oldValue !== newValue) {
        undoPush({ undo: async () => { await window.api.tasksUpdate(taskId, oldValue); }, redo: async () => { await window.api.tasksUpdate(taskId, newValue); } });
      }
      await reloadTasks();
    }
    setEditMode(null);
  }, [editMode, editValue, tasks, reloadData, reloadTasks, undoPush, onEvaporate]);

  const cancel = useCallback(() => setEditMode(null), []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
  }, [commit]);

  return [
    { editMode, editValue, inputRef },
    { start, commit, cancel, handleInputKeyDown },
    { setEditMode, setEditValue }
  ];
}
