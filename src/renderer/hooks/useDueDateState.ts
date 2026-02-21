import { useCallback, useRef, useState } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';

interface UseDueDateStateParams {
  focusedPane: Pane;
  tasks: Task[];
  selectedTaskIndex: number;
  reloadTasks: () => Promise<void>;
}

export function useDueDateState({ focusedPane, tasks, selectedTaskIndex, reloadTasks }: UseDueDateStateParams): [
  number | null,
  { start: () => void; commit: (value: string) => Promise<void>; cancel: () => void; blur: () => void }
] {
  const [dueDateIndex, setDueDateIndex] = useState<number | null>(null);
  const cancelRef = useRef(false);

  const start = useCallback(() => {
    if ((focusedPane === 'tasks' || focusedPane === 'detail') && tasks[selectedTaskIndex]) {
      setDueDateIndex(selectedTaskIndex);
    }
  }, [focusedPane, tasks, selectedTaskIndex]);

  const commit = useCallback(async (value: string) => {
    if (cancelRef.current) { cancelRef.current = false; return; }
    const task = tasks[dueDateIndex!];
    const dueDate = value ? new Date(value).getTime() : null;
    await window.api.tasksSetDueDate(task.id, dueDate);
    setDueDateIndex(null);
    await reloadTasks();
  }, [dueDateIndex, tasks, reloadTasks]);

  const cancel = useCallback(() => { cancelRef.current = true; setDueDateIndex(null); }, []);

  const blur = useCallback(() => { (document.activeElement as HTMLElement)?.blur(); }, []);

  return [dueDateIndex, { start, commit, cancel, blur }];
}
