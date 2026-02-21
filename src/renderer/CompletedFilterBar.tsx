import type { ReactNode } from 'react';
import type { List } from '../shared/types';
import type { CompletedFilter, DateRangePreset } from './types';

interface CompletedFilterBarProps {
  filter: CompletedFilter;
  onFilterChange: (filter: CompletedFilter) => void;
  listsWithCompletedTasks: List[];
}

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'custom', label: 'Custom...' },
];

function parseListIdValue(value: string): string | null | 'all' {
  if (value === 'all') return 'all';
  if (value === 'null') return null;
  return value;
}

export function CompletedFilterBar({ filter, onFilterChange, listsWithCompletedTasks }: CompletedFilterBarProps): ReactNode {
  return (
    <div className="completed-filter-bar">
      <select
        value={filter.listId ?? 'null'}
        onChange={(e) => onFilterChange({ ...filter, listId: parseListIdValue(e.target.value) })}
        aria-label="Filter by project"
      >
        <option value="all">All Projects</option>
        <option value="null">Inbox</option>
        {listsWithCompletedTasks.map((list) => (
          <option key={list.id} value={list.id}>{list.name || 'Untitled'}</option>
        ))}
      </select>
      <select
        value={filter.dateRange}
        onChange={(e) => onFilterChange({ ...filter, dateRange: e.target.value as DateRangePreset })}
        aria-label="Filter by date range"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      {filter.dateRange === 'custom' && (
        <>
          <input
            type="date"
            value={filter.customStart ? new Date(filter.customStart).toISOString().split('T')[0] : ''}
            onChange={(e) => onFilterChange({ ...filter, customStart: e.target.value ? new Date(e.target.value).getTime() : undefined })}
            aria-label="Start date"
          />
          <input
            type="date"
            value={filter.customEnd ? new Date(filter.customEnd).toISOString().split('T')[0] : ''}
            onChange={(e) => onFilterChange({ ...filter, customEnd: e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined })}
            aria-label="End date"
          />
        </>
      )}
    </div>
  );
}
