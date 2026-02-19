import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Folder, List, Task } from '../../shared/types';
import { buildSidebarItems, SidebarItem } from '../utils/buildSidebarItems';

interface DataState {
  folders: Folder[];
  lists: List[];
  tasks: Task[];
  taskCounts: Record<string, number>;
  sidebarItems: SidebarItem[];
  selectedSidebarItem: SidebarItem | undefined;
  selectedListId: string | null;
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

  const reloadTasks = useCallback(async () => {
    if (selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'inbox') {
      setTasks(await window.api.tasksGetInbox());
      return;
    }
    if (selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed') {
      setTasks(await window.api.tasksGetCompleted());
      return;
    }
    if (selectedListId && selectedSidebarItem?.type === 'list') {
      setTasks(await window.api.tasksGetByList(selectedListId));
    }
  }, [selectedListId, selectedSidebarItem]);

  useEffect(() => {
    Promise.all([window.api.foldersGetAll(), window.api.listsGetAll()]).then(([f, l]) => {
      setFolders(f);
      setLists(l);
    });
  }, []);

  useEffect(() => {
    const loadCounts = async (): Promise<void> => {
      const counts: Record<string, number> = {};
      counts['inbox'] = await window.api.tasksGetInboxCount();
      counts['completed'] = (await window.api.tasksGetCompleted()).length;
      for (const list of lists) {
        counts[list.id] = await window.api.listsGetTaskCount(list.id);
      }
      setTaskCounts(counts);
    };
    loadCounts();
  }, [lists, tasks.length]);

  useEffect(() => {
    if (selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'inbox') {
      window.api.tasksGetInbox().then((t) => {
        setTasks(t);
        setSelectedTaskIndex(0);
      });
    } else if (selectedSidebarItem?.type === 'smart' && selectedSidebarItem.smartList.id === 'completed') {
      window.api.tasksGetCompleted().then((t) => {
        setTasks(t);
        setSelectedTaskIndex(0);
      });
    } else if (selectedListId && selectedSidebarItem?.type === 'list') {
      window.api.tasksGetByList(selectedListId).then((t) => {
        setTasks(t);
        setSelectedTaskIndex(0);
      });
    } else {
      setTasks([]);
    }
  }, [selectedListId, selectedSidebarItem, setSelectedTaskIndex]);

  return [
    { folders, lists, tasks, taskCounts, sidebarItems, selectedSidebarItem, selectedListId },
    { reloadData, reloadTasks, setTasks, setFolders, setLists },
  ];
}
