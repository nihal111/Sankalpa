import { useState, useCallback } from 'react';
import type { SidebarItem } from '../types';
import type { Task } from '../../shared/types';

interface UseSearchStateParams {
  sidebarItems: SidebarItem[];
  setTasks: (tasks: Task[]) => void;
  setSelectedSidebarIndex: (index: number) => void;
  setSelectedTaskIndex: (index: number) => void;
  setFocusedPane: (pane: 'lists' | 'tasks') => void;
  flash: (id: string) => void;
}

export function useSearchState(params: UseSearchStateParams) {
  const { sidebarItems, setTasks, setSelectedSidebarIndex, setSelectedTaskIndex, setFocusedPane, flash } = params;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  const openSearch = useCallback(() => { setIsSearchOpen(true); }, []);
  const closeSearch = useCallback(() => { setIsSearchOpen(false); }, []);

  const handleSearchSelect = useCallback(async (taskId: string, listId: string | null) => {
    setIsSearchOpen(false);
    let targetIndex = listId === null ? 0 : sidebarItems.findIndex((item) => item.type === 'list' && item.list.id === listId);
    if (targetIndex < 0) targetIndex = 0;
    setSelectedSidebarIndex(targetIndex);
    const newTasks = listId === null ? await window.api.tasksGetInbox() : await window.api.tasksGetByList(listId);
    setTasks(newTasks);
    const taskIndex = newTasks.findIndex((t) => t.id === taskId);
    setSelectedTaskIndex(taskIndex >= 0 ? taskIndex : 0);
    setFocusedPane('tasks');
    flash(taskId);
  }, [sidebarItems, setTasks, setSelectedSidebarIndex, setSelectedTaskIndex, setFocusedPane, flash]);

  return { isSearchOpen, lastSearchQuery, setLastSearchQuery, openSearch, closeSearch, handleSearchSelect };
}
