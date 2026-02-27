import { useCallback, useState, useRef } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';

interface UseDurationStateParams {
  focusedPane: Pane;
  selectedTask: Task | null;
  selectedTaskIndex: number;
  reloadTasks: () => Promise<void>;
}

export function useDurationState({ focusedPane, selectedTask, selectedTaskIndex, reloadTasks }: UseDurationStateParams): [
  number | null,
  { start: () => void; commit: (minutes: number | null) => Promise<void>; cancel: () => void }
] {
  const [durationIndex, setDurationIndex] = useState<number | null>(null);
  const taskIdRef = useRef<string | null>(null);

  const start = useCallback(() => {
    if ((focusedPane === 'tasks' || focusedPane === 'detail') && selectedTask) {
      taskIdRef.current = selectedTask.id;
      setDurationIndex(selectedTaskIndex);
    }
  }, [focusedPane, selectedTask, selectedTaskIndex]);

  const commit = useCallback(async (minutes: number | null) => {
    if (!taskIdRef.current) return;
    await window.api.tasksSetDuration(taskIdRef.current, minutes);
    setDurationIndex(null);
    taskIdRef.current = null;
    await reloadTasks();
  }, [reloadTasks]);

  const cancel = useCallback(() => { setDurationIndex(null); taskIdRef.current = null; }, []);

  return [durationIndex, { start, commit, cancel }];
}
