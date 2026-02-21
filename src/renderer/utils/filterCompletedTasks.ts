import type { Task } from '../../shared/types';
import type { CompletedFilter } from '../types';

function getDateBoundary(preset: CompletedFilter['dateRange']): { start: number; end: number } | null {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (preset) {
    case 'all': return null;
    case 'today': return { start: todayMidnight, end: Date.now() };
    case 'yesterday': return { start: todayMidnight - dayMs, end: todayMidnight };
    case 'last7': return { start: todayMidnight - 7 * dayMs, end: Date.now() };
    case 'last30': return { start: todayMidnight - 30 * dayMs, end: Date.now() };
    case 'thisMonth': return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: Date.now() };
    case 'custom': return null;
  }
}

export function filterCompletedTasks(tasks: Task[], filter: CompletedFilter): Task[] {
  let result = tasks;

  if (filter.listId !== 'all') {
    result = result.filter((t) => t.list_id === filter.listId);
  }

  if (filter.dateRange === 'custom') {
    const { customStart, customEnd } = filter;
    if (customStart !== undefined && customEnd !== undefined) {
      result = result.filter((t) => t.completed_timestamp !== null && t.completed_timestamp >= customStart && t.completed_timestamp <= customEnd);
    }
  } else {
    const boundary = getDateBoundary(filter.dateRange);
    if (boundary) {
      result = result.filter((t) => t.completed_timestamp !== null && t.completed_timestamp >= boundary.start && t.completed_timestamp <= boundary.end);
    }
  }

  return result;
}
