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
  selectedTask: Task | null;
  selectedTaskIndex: number;
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
  const { focusedPane, selectedSidebarItem, selectedTask, selectedTaskIndex, reloadData, reloadTasks, undoPush, onEvaporate } = params;
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef<string>('');
  const editTaskIdRef = useRef<string | null>(null);

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
    if (!editMode) { prevValueRef.current = ''; editTaskIdRef.current = null; return; }
    if (editMode.type === 'task' && selectedTask) {
      prevValueRef.current = selectedTask.title;
      editTaskIdRef.current = selectedTask.id;
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
    } else if (focusedPane === 'tasks' && selectedTask) {
      prevValueRef.current = selectedTask.title;
      editTaskIdRef.current = selectedTask.id;
      setEditMode({ type: 'task', index: selectedTaskIndex });
      setEditValue(selectedTask.title);
    }
  }, [focusedPane, selectedSidebarItem, selectedTask, selectedTaskIndex]);

  const commit = useCallback(async () => {
    if (!editMode) { setEditMode(null); return; }
    const oldValue = prevValueRef.current;
    const newValue = editValue.trim();
    const taskId = editTaskIdRef.current;
    if (!newValue) {
      // Empty title: delete the task (evaporate)
      if (editMode.type === 'task' && taskId) {
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
    } else if (taskId) {
      await window.api.tasksUpdate(taskId, newValue);
      if (oldValue != null && oldValue !== newValue) {
        undoPush({ undo: async () => { await window.api.tasksUpdate(taskId, oldValue); }, redo: async () => { await window.api.tasksUpdate(taskId, newValue); } });
      }
      await reloadTasks();
    }
    setEditMode(null);
  }, [editMode, editValue, reloadData, reloadTasks, undoPush, onEvaporate]);

  const cancel = useCallback(() => {
    // If canceling an empty task, evaporate it
    const taskId = editTaskIdRef.current;
    if (editMode?.type === 'task' && !editValue.trim() && taskId) {
      onEvaporate?.(taskId);
      setTimeout(async () => {
        await window.api.tasksDelete(taskId);
        await reloadTasks();
      }, 200);
    }
    setEditMode(null);
  }, [editMode, editValue, onEvaporate, reloadTasks]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
  }, [commit]);

  return [
    { editMode, editValue, inputRef },
    { start, commit, cancel, handleInputKeyDown },
    { setEditMode, setEditValue }
  ];
}
