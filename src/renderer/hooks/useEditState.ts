import { useRef, useState, useCallback, useEffect } from 'react';
import type { EditMode, Pane } from '../types';
import type { Task } from '../../shared/types';

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
  const { focusedPane, selectedSidebarItem, selectedTaskIndex, tasks, reloadData, reloadTasks } = params;
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const start = useCallback(() => {
    const item = selectedSidebarItem;
    if (focusedPane === 'lists' && item?.type === 'list') {
      setEditMode({ type: 'list', id: item.list!.id });
      setEditValue(item.list!.name);
    } else if (focusedPane === 'lists' && item?.type === 'folder') {
      setEditMode({ type: 'folder', id: item.folder!.id });
      setEditValue(item.folder!.name);
    } else if (focusedPane === 'tasks' && tasks[selectedTaskIndex]) {
      setEditMode({ type: 'task', index: selectedTaskIndex });
      setEditValue(tasks[selectedTaskIndex].title);
    }
  }, [focusedPane, selectedSidebarItem, selectedTaskIndex, tasks]);

  const commit = useCallback(async () => {
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
