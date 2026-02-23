import { useState, useCallback } from 'react';
import type { Task } from '../../shared/types';
import type { SidebarItem, Pane } from '../types';

interface ContextMenuItem { label: string; action: () => void }
interface ContextMenuState { x: number; y: number; items: ContextMenuItem[] }

interface UseContextMenuParams {
  hardcoreMode: boolean;
  tasks: Task[];
  sidebarItems: SidebarItem[];
  setSelectedTaskIndex: (index: number) => void;
  setSelectedSidebarIndex: (index: number) => void;
  setFocusedPane: (pane: Pane) => void;
  editActions: { start: () => void };
  moveActions: { start: () => void };
  dueDateActions: { start: () => void };
  toggleTaskCompleted: () => void;
  deleteTask: () => void;
  deleteList: () => void;
  duplicateTask: () => void;
}

export function useContextMenu(params: UseContextMenuParams) {
  const { hardcoreMode, tasks, sidebarItems, setSelectedTaskIndex, setSelectedSidebarIndex, setFocusedPane,
    editActions, moveActions, dueDateActions, toggleTaskCompleted, deleteTask, deleteList, duplicateTask } = params;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleTaskContextMenu = useCallback((index: number, x: number, y: number) => {
    if (hardcoreMode) return;
    setSelectedTaskIndex(index);
    setFocusedPane('tasks');
    const task = tasks[index];
    if (!task) return;
    setContextMenu({ x, y, items: [
      { label: 'Edit', action: editActions.start },
      { label: task.status === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Complete', action: toggleTaskCompleted },
      { label: 'Move to...', action: moveActions.start },
      { label: 'Set Due Date', action: dueDateActions.start },
      { label: 'Duplicate', action: duplicateTask },
      { label: 'Delete', action: deleteTask },
    ]});
  }, [hardcoreMode, tasks, setSelectedTaskIndex, setFocusedPane, editActions, toggleTaskCompleted, moveActions, dueDateActions, deleteTask, duplicateTask]);

  const handleSidebarContextMenu = useCallback((index: number, x: number, y: number) => {
    if (hardcoreMode) return;
    setSelectedSidebarIndex(index);
    setFocusedPane('lists');
    const item = sidebarItems[index];
    if (!item || item.type !== 'list') return;
    setContextMenu({ x, y, items: [
      { label: 'Edit', action: editActions.start },
      { label: 'Delete', action: deleteList },
    ]});
  }, [hardcoreMode, sidebarItems, setSelectedSidebarIndex, setFocusedPane, editActions, deleteList]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  return { contextMenu, handleTaskContextMenu, handleSidebarContextMenu, closeContextMenu };
}
