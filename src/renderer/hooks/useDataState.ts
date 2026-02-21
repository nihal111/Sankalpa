import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Folder, List, Task } from '../../shared/types';
import { buildSidebarItems, SidebarItem } from '../utils/buildSidebarItems';
import { todayBounds } from '../utils/dateBounds';

interface DataState {
  folders: Folder[];
  lists: List[];
  tasks: Task[];
  taskCounts: Record<string, number>;
  sidebarItems: SidebarItem[];
  selectedSidebarItem: SidebarItem | undefined;
  selectedListId: string | null;
  trashIndex: number;
}

interface DataActions {
  reloadData: () => Promise<void>;
  reloadTasks: () => Promise<void>;
  setTasks: (tasks: Task[]) => void;
  setFolders: (folders: Folder[]) => void;
  setLists: (lists: List[]) => void;
}

export function useDataState(
  selectedSidebarIndex: number,
  setSelectedTaskIndex: (index: number) => void
): [DataState, DataActions] {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const sidebarItems = useMemo(() => buildSidebarItems(folders, lists), [folders, lists]);
  const trashIndex = useMemo(() => sidebarItems.length - 1, [sidebarItems]);
  const selectedSidebarItem = useMemo(() => sidebarItems[selectedSidebarIndex], [sidebarItems, selectedSidebarIndex]);
  const selectedListId = useMemo(() =>
    selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list.id
      : selectedSidebarItem?.type === 'smart' ? selectedSidebarItem.smartList.id
      : null,
  [selectedSidebarItem]);

  const reloadData = useCallback(async () => {
    const [f, l] = await Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]);
    setFolders(f);
    setLists(l);
  }, []);

  const loadSmartTasks = useCallback(async (smartId: string): Promise<Task[]> => {
    const [start, end] = todayBounds();
    switch (smartId) {
      case 'inbox': return window.api.tasksGetInbox();
      case 'completed': return window.api.tasksGetCompleted();
      case 'overdue': return window.api.tasksGetOverdue(start);
      case 'today': return window.api.tasksGetDueBetween(start, end);
      case 'upcoming': return window.api.tasksGetUpcoming(end);
    }
    return [];
  }, []);

  const reloadTasks = useCallback(async () => {
    if (selectedSidebarItem?.type === 'smart') {
      setTasks(await loadSmartTasks(selectedSidebarItem.smartList.id));
      return;
    }
    if (selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'trash') {
      setTasks(await window.api.tasksGetTrashed());
      return;
    }
    if (selectedListId && selectedSidebarItem?.type === 'list') {
      setTasks(await window.api.tasksGetByList(selectedListId));
    }
  }, [selectedListId, selectedSidebarItem, loadSmartTasks]);

  useEffect(() => {
    Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]).then(([f, l]) => {
      setFolders(f);
      setLists(l);
    });
  }, []);

  useEffect(() => {
    const loadCounts = async (): Promise<void> => {
      const [start, end] = todayBounds();
      const counts: Record<string, number> = {};
      counts['inbox'] = await window.api.tasksGetInboxCount();
      counts['completed'] = (await window.api.tasksGetCompleted()).length;
      counts['overdue'] = (await window.api.tasksGetOverdue(start)).length;
      counts['today'] = (await window.api.tasksGetDueBetween(start, end)).length;
      counts['upcoming'] = (await window.api.tasksGetUpcoming(end)).length;
      counts['trash'] = (await window.api.tasksGetTrashed()).length;
      for (const list of lists) {
        counts[list.id] = await window.api.listsGetTaskCount(list.id);
      }
      setTaskCounts(counts);
    };
    loadCounts();
  }, [lists, tasks.length]);

  useEffect(() => {
    let stale = false;
    if (selectedSidebarItem?.type === 'smart') {
      loadSmartTasks(selectedSidebarItem.smartList.id).then((t) => {
        if (!stale) { setTasks(t); setSelectedTaskIndex(0); }
      });
    } else if (selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'trash') {
      window.api.tasksGetTrashed().then((t) => {
        setTasks(t);
        setSelectedTaskIndex(0);
      });
    } else if (selectedListId && selectedSidebarItem?.type === 'list') {
      window.api.tasksGetByList(selectedListId).then((t) => {
        if (!stale) { setTasks(t); setSelectedTaskIndex(0); }
      });
    } else {
      setTasks([]);
    }
    return () => { stale = true; };
  }, [selectedListId, selectedSidebarItem, setSelectedTaskIndex, loadSmartTasks]);

  return [
    { folders, lists, tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId, trashIndex },
    { reloadData, reloadTasks, setTasks, setFolders, setLists },
  ];
}
