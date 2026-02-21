import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Folder, List, Task } from '../../shared/types';
import { buildSidebarItems, SidebarItem } from '../utils/buildSidebarItems';
import { todayBounds } from '../utils/dateBounds';
import type { CompletedFilter } from '../types';
import { filterCompletedTasks } from '../utils/filterCompletedTasks';

interface DataState {
  folders: Folder[];
  lists: List[];
  tasks: Task[];
  taskCounts: Record<string, number>;
  sidebarItems: SidebarItem[];
  selectedSidebarItem: SidebarItem | undefined;
  selectedListId: string | null;
  trashIndex: number;
  completedFilter: CompletedFilter;
  listsWithCompletedTasks: List[];
}

interface DataActions {
  reloadData: () => Promise<void>;
  reloadTasks: () => Promise<void>;
  setTasks: (tasks: Task[]) => void;
  setFolders: (folders: Folder[]) => void;
  setLists: (lists: List[]) => void;
  setCompletedFilter: (filter: CompletedFilter) => void;
}

export function useDataState(
  selectedSidebarIndex: number,
  setSelectedTaskIndex: (index: number) => void
): [DataState, DataActions] {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allCompletedTasks, setAllCompletedTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>({ listId: 'all', dateRange: 'all' });

  const sidebarItems = useMemo(() => buildSidebarItems(folders, lists), [folders, lists]);
  const trashIndex = useMemo(() => sidebarItems.length - 1, [sidebarItems]);
  const selectedSidebarItem = useMemo(() => sidebarItems[selectedSidebarIndex], [sidebarItems, selectedSidebarIndex]);
  const selectedListId = useMemo(() =>
    selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list.id
      : selectedSidebarItem?.type === 'smart' ? selectedSidebarItem.smartList.id
      : null,
  [selectedSidebarItem]);

  const isCompletedView = useMemo(() =>
    selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed',
  [selectedSidebarItem]);

  const listsWithCompletedTasks = useMemo(() => {
    const listIdsWithTasks = new Set(allCompletedTasks.map((t) => t.list_id).filter((id): id is string => id !== null));
    return lists.filter((l) => listIdsWithTasks.has(l.id));
  }, [allCompletedTasks, lists]);

  const filteredTasks = useMemo(() =>
    isCompletedView ? filterCompletedTasks(allCompletedTasks, completedFilter) : tasks,
  [isCompletedView, allCompletedTasks, completedFilter, tasks]);

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
      case 'trash': return window.api.tasksGetTrashed();
    }
    return [];
  }, []);

  const reloadTasks = useCallback(async () => {
    if (selectedSidebarItem?.type === 'smart') {
      const smartId = selectedSidebarItem.smartList.id;
      if (smartId === 'completed') {
        const completed = await window.api.tasksGetCompleted();
        setAllCompletedTasks(completed);
        setTasks(completed);
      } else {
        setTasks(await loadSmartTasks(smartId));
      }
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
    const timer = setTimeout(loadCounts, 300);
    return () => clearTimeout(timer);
  }, [lists, tasks.length]);

  useEffect(() => {
    let stale = false;
    if (selectedSidebarItem?.type === 'smart') {
      const smartId = selectedSidebarItem.smartList.id;
      if (smartId === 'completed') {
        window.api.tasksGetCompleted().then((t) => {
          if (!stale) {
            setAllCompletedTasks(t);
            setTasks(t);
            setSelectedTaskIndex(0);
          }
        });
      } else {
        loadSmartTasks(smartId).then((t) => {
          if (!stale) { setTasks(t); setSelectedTaskIndex(0); }
        });
      }
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
    { folders, lists, tasks: filteredTasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId, trashIndex, completedFilter, listsWithCompletedTasks },
    { reloadData, reloadTasks, setTasks, setFolders, setLists, setCompletedFilter },
  ];
}
