import { useCallback } from 'react';
import type { Pane } from '../types';
import type { SidebarItem } from '../utils/buildSidebarItems';

interface UseSidebarNavigationParams {
  focusedPane: Pane;
  selectedSidebarItem: SidebarItem | undefined;
  selectedSidebarIndex: number;
  sidebarItems: SidebarItem[];
  setSelectedSidebarIndex: (fn: (i: number) => number) => void;
  setFocusedPane: (pane: Pane) => void;
  reloadData: () => Promise<void>;
  clearSelection: () => void;
}

interface SidebarNavigationActions {
  handleHorizontalArrow: (direction: 'left' | 'right') => Promise<void>;
}

export function useSidebarNavigation(params: UseSidebarNavigationParams): SidebarNavigationActions {
  const { focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems, setSelectedSidebarIndex, setFocusedPane, reloadData, clearSelection } = params;

  const handleHorizontalArrow = useCallback(async (direction: 'left' | 'right') => {
    if (focusedPane === 'tasks') {
      if (direction === 'left') { clearSelection(); setFocusedPane('lists'); }
      return;
    }
    const item = selectedSidebarItem;
    if (direction === 'right') {
      setFocusedPane('tasks');
    } else {
      if (item?.type === 'folder' && item.folder.is_expanded) {
        await window.api.foldersToggleExpanded(item.folder.id);
        await reloadData();
      } else if (item?.type === 'list' && item.list.folder_id) {
        const parentIndex = sidebarItems.findIndex(
          (si) => si.type === 'folder' && si.folder.id === item.list.folder_id
        );
        if (parentIndex >= 0) setSelectedSidebarIndex(() => parentIndex);
      }
    }
  }, [focusedPane, selectedSidebarItem, selectedSidebarIndex, sidebarItems, setSelectedSidebarIndex, setFocusedPane, reloadData, clearSelection]);

  return { handleHorizontalArrow };
}
