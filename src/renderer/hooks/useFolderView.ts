import { useState, useEffect, useMemo, useCallback } from 'react';
import type { List, Task } from '../../shared/types';
import type { SidebarItem } from '../types';
import { flattenWithDepth } from '../utils/taskTree';
import type { TaskWithDepth } from '../utils/taskTree';

interface ListSection {
  list: List;
  tasks: Task[];
  expanded: boolean;
}

export type FolderViewRow = { type: 'header'; listId: string; name: string; expanded: boolean }
  | { type: 'task'; task: Task; depth: number; flatTask: TaskWithDepth };

interface UseFolderViewResult {
  sections: ListSection[];
  rows: FolderViewRow[];
  toggleSection: (listId: string) => void;
}

export function useFolderView(selectedSidebarItem: SidebarItem | undefined, lists: List[]): UseFolderViewResult {
  const [sections, setSections] = useState<ListSection[]>([]);

  const folderId = selectedSidebarItem?.type === 'folder' ? selectedSidebarItem.folder.id : null;
  const folderLists = useMemo(() => folderId ? lists.filter((l) => l.folder_id === folderId) : [], [lists, folderId]);

  useEffect(() => {
    if (!folderId) { setSections([]); return; }
    let stale = false;
    Promise.all(folderLists.map(async (list) => {
      const tasks = await window.api.tasksGetByList(list.id);
      return { list, tasks, expanded: true };
    })).then((result) => {
      if (!stale) setSections(result);
    });
    return () => { stale = true; };
  }, [folderId, folderLists]);

  const rows = useMemo(() => {
    const result: FolderViewRow[] = [];
    for (const section of sections) {
      result.push({ type: 'header', listId: section.list.id, name: section.list.name, expanded: section.expanded });
      if (section.expanded) {
        for (const ft of flattenWithDepth(section.tasks)) {
          result.push({ type: 'task', task: ft.task, depth: ft.depth, flatTask: ft });
        }
      }
    }
    return result;
  }, [sections]);

  const toggleSection = useCallback((listId: string) => {
    setSections((prev) => prev.map((s) => s.list.id === listId ? { ...s, expanded: !s.expanded } : s));
  }, []);

  return { sections, rows, toggleSection };
}
