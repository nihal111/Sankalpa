import { useCallback, useState } from 'react';
import type { Task } from '../../shared/types';
import type { Pane } from '../types';

interface UseDurationStateParams {
  focusedPane: Pane;
  tasks: Task[];
  selectedTaskIndex: number;
  reloadTasks: () => Promise<void>;
}

export function useDurationState({ focusedPane, tasks, selectedTaskIndex, reloadTasks }: UseDurationStateParams): [
  number | null,
  { start: () => void; commit: (minutes: number | null) => Promise<void>; cancel: () => void }
] {
  const [durationIndex, setDurationIndex] = useState<number | null>(null);

  const start = useCallback(() => {
    if ((focusedPane === 'tasks' || focusedPane === 'detail') && tasks[selectedTaskIndex]) {
      setDurationIndex(selectedTaskIndex);
    }
  }, [focusedPane, tasks, selectedTaskIndex]);

  const commit = useCallback(async (minutes: number | null) => {
    const task = tasks[durationIndex!];
    await window.api.tasksSetDuration(task.id, minutes);
    setDurationIndex(null);
    await reloadTasks();
  }, [durationIndex, tasks, reloadTasks]);

  const cancel = useCallback(() => { setDurationIndex(null); }, []);

  return [durationIndex, { start, commit, cancel }];
}
