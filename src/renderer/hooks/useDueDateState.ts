import { useCallback, useState } from 'react';
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
  { start: () => void; commit: (timestamp: number | null) => Promise<void>; cancel: () => void }
] {
  const [dueDateIndex, setDueDateIndex] = useState<number | null>(null);

  const start = useCallback(() => {
    if ((focusedPane === 'tasks' || focusedPane === 'detail') && tasks[selectedTaskIndex]) {
      setDueDateIndex(selectedTaskIndex);
    }
  }, [focusedPane, tasks, selectedTaskIndex]);

  const commit = useCallback(async (timestamp: number | null) => {
    const task = tasks[dueDateIndex!];
    await window.api.tasksSetDueDate(task.id, timestamp);
    setDueDateIndex(null);
    await reloadTasks();
  }, [dueDateIndex, tasks, reloadTasks]);

  const cancel = useCallback(() => { setDueDateIndex(null); }, []);

  return [dueDateIndex, { start, commit, cancel }];
}
