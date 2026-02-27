import { useState, useCallback, useMemo } from 'react';
import type { Task } from '../../shared/types';
import type { SidebarItem, Pane } from '../types';

export interface ContextMenuItem { label: string; action: () => void }
type MenuType = { type: 'task'; taskStatus: string } | { type: 'sidebar' };
interface ContextMenuState { x: number; y: number; menuType: MenuType }

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
  duplicateList: () => Promise<void>;
  startMoveList: () => void;
  showListInfo: () => void;
}

export function useContextMenu(params: UseContextMenuParams) {
  const { hardcoreMode, tasks, sidebarItems, setSelectedTaskIndex, setSelectedSidebarIndex, setFocusedPane,
    editActions, moveActions, dueDateActions, toggleTaskCompleted, deleteTask, deleteList, duplicateTask, duplicateList, startMoveList, showListInfo } = params;
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);

  const handleTaskContextMenu = useCallback((index: number, x: number, y: number) => {
    if (hardcoreMode) return;
    setSelectedTaskIndex(index);
    setFocusedPane('tasks');
    const task = tasks[index];
    if (!task) return;
    setMenuState({ x, y, menuType: { type: 'task', taskStatus: task.status } });
  }, [hardcoreMode, tasks, setSelectedTaskIndex, setFocusedPane]);

  const handleSidebarContextMenu = useCallback((index: number, x: number, y: number) => {
    if (hardcoreMode) return;
    setSelectedSidebarIndex(index);
    setFocusedPane('lists');
    const item = sidebarItems[index];
    if (!item || item.type !== 'list') return;
    setMenuState({ x, y, menuType: { type: 'sidebar' } });
  }, [hardcoreMode, sidebarItems, setSelectedSidebarIndex, setFocusedPane]);

  const contextMenu = useMemo(() => {
    if (!menuState) return null;
    const { x, y, menuType } = menuState;
    const items: ContextMenuItem[] = menuType.type === 'task'
      ? [
          { label: 'Edit', action: editActions.start },
          { label: menuType.taskStatus === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Complete', action: toggleTaskCompleted },
          { label: 'Move to...', action: moveActions.start },
          { label: 'Set Due Date', action: dueDateActions.start },
          { label: 'Duplicate', action: duplicateTask },
          { label: 'Delete', action: deleteTask },
        ]
      : [
          { label: 'Rename', action: editActions.start },
          { label: 'Duplicate', action: duplicateList },
          { label: 'Move to Folder', action: startMoveList },
          { label: 'Show Info', action: showListInfo },
          { label: 'Delete', action: deleteList },
        ];
    return { x, y, items };
  }, [menuState, editActions, moveActions, dueDateActions, toggleTaskCompleted, deleteTask, deleteList, duplicateTask, duplicateList, startMoveList, showListInfo]);

  const closeContextMenu = useCallback(() => setMenuState(null), []);

  return { contextMenu, handleTaskContextMenu, handleSidebarContextMenu, closeContextMenu };
}
