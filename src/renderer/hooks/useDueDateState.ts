import { useCallback, useState, useRef } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';

interface UseDueDateStateParams {
  focusedPane: Pane;
  selectedTask: Task | null;
  selectedTaskIndex: number;
  reloadTasks: () => Promise<void>;
}

export function useDueDateState({ focusedPane, selectedTask, selectedTaskIndex, reloadTasks }: UseDueDateStateParams): [
  number | null,
  { start: () => void; commit: (timestamp: number | null) => Promise<void>; cancel: () => void }
] {
  const [dueDateIndex, setDueDateIndex] = useState<number | null>(null);
  const taskIdRef = useRef<string | null>(null);

  const start = useCallback(() => {
    if ((focusedPane === 'tasks' || focusedPane === 'detail') && selectedTask) {
      taskIdRef.current = selectedTask.id;
      setDueDateIndex(selectedTaskIndex);
    }
  }, [focusedPane, selectedTask, selectedTaskIndex]);

  const commit = useCallback(async (timestamp: number | null) => {
    if (!taskIdRef.current) return;
    await window.api.tasksSetDueDate(taskIdRef.current, timestamp);
    setDueDateIndex(null);
    taskIdRef.current = null;
    await reloadTasks();
  }, [reloadTasks]);

  const cancel = useCallback(() => { setDueDateIndex(null); taskIdRef.current = null; }, []);

  return [dueDateIndex, { start, commit, cancel }];
}
