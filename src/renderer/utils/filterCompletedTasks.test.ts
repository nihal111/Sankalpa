import { describe, it, expect } from 'vitest';
import { filterCompletedTasks } from './filterCompletedTasks';
import type { Task } from '../../shared/types';
import type { CompletedFilter } from '../types';

const baseTask = {
  status: 'COMPLETED' as const,
  created_timestamp: 0,
  due_date: null,
  notes: null,
  sort_key: 1,
  created_at: 0,
  updated_at: 0,
  deleted_at: null,
  parent_id: null,
  is_expanded: 1,
};

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const tasks: Task[] = [
  { ...baseTask, id: '1', list_id: 'a', title: 'Today', completed_timestamp: now - 1000 },
  { ...baseTask, id: '2', list_id: 'b', title: 'Yesterday', completed_timestamp: now - dayMs - 1000 },
  { ...baseTask, id: '3', list_id: null, title: 'Old', completed_timestamp: now - 60 * dayMs },
];

describe('filterCompletedTasks', () => {
  it('returns all tasks with default filter', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'all' };
    expect(filterCompletedTasks(tasks, filter)).toHaveLength(3);
  });

  it('filters by listId', () => {
    const filter: CompletedFilter = { listId: 'a', dateRange: 'all' };
    expect(filterCompletedTasks(tasks, filter)).toHaveLength(1);
    expect(filterCompletedTasks(tasks, filter)[0].id).toBe('1');
  });

  it('filters by null listId (inbox)', () => {
    const filter: CompletedFilter = { listId: null, dateRange: 'all' };
    expect(filterCompletedTasks(tasks, filter)).toHaveLength(1);
    expect(filterCompletedTasks(tasks, filter)[0].id).toBe('3');
  });

  it('filters by today', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'today' };
    const result = filterCompletedTasks(tasks, filter);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((t) => t.id === '1')).toBe(true);
  });

  it('filters by yesterday', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'yesterday' };
    const result = filterCompletedTasks(tasks, filter);
    expect(result.some((t) => t.id === '2')).toBe(true);
    expect(result.some((t) => t.id === '1')).toBe(false);
  });

  it('filters by last7', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'last7' };
    const result = filterCompletedTasks(tasks, filter);
    expect(result.some((t) => t.id === '1')).toBe(true);
    expect(result.some((t) => t.id === '3')).toBe(false);
  });

  it('filters by last30', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'last30' };
    const result = filterCompletedTasks(tasks, filter);
    expect(result.some((t) => t.id === '1')).toBe(true);
    expect(result.some((t) => t.id === '3')).toBe(false);
  });

  it('filters by thisMonth', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'thisMonth' };
    const result = filterCompletedTasks(tasks, filter);
    expect(result.some((t) => t.id === '1')).toBe(true);
  });

  it('filters by custom date range', () => {
    const filter: CompletedFilter = {
      listId: 'all',
      dateRange: 'custom',
      customStart: now - 2 * dayMs,
      customEnd: now,
    };
    const result = filterCompletedTasks(tasks, filter);
    expect(result.some((t) => t.id === '1')).toBe(true);
    expect(result.some((t) => t.id === '3')).toBe(false);
  });

  it('custom range with no bounds returns all', () => {
    const filter: CompletedFilter = { listId: 'all', dateRange: 'custom' };
    expect(filterCompletedTasks(tasks, filter)).toHaveLength(3);
  });
});
