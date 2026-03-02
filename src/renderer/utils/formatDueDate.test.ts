import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatDueDate } from './formatDueDate';

describe('formatDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  it('shows "Today" for today', () => {
    const today = new Date('2024-01-15T14:30:00').getTime();
    const result = formatDueDate(today);
    expect(result).toContain('Today');
  });

  it('shows "Tomorrow" for tomorrow', () => {
    const tomorrow = new Date('2024-01-16T14:30:00').getTime();
    const result = formatDueDate(tomorrow);
    expect(result).toContain('Tomorrow');
  });

  it('shows "Yesterday" for yesterday', () => {
    const yesterday = new Date('2024-01-14T14:30:00').getTime();
    const result = formatDueDate(yesterday);
    expect(result).toContain('Yesterday');
  });

  it('shows weekday for dates within 7 days', () => {
    const nextMonday = new Date('2024-01-22T14:30:00').getTime();
    const result = formatDueDate(nextMonday);
    expect(result).toContain('Monday');
  });

  it('shows month/day for dates beyond 7 days', () => {
    const farFuture = new Date('2024-02-15T14:30:00').getTime();
    const result = formatDueDate(farFuture);
    expect(result).toContain('Feb');
  });

  it('includes time in output', () => {
    const today = new Date('2024-01-15T14:30:00').getTime();
    const result = formatDueDate(today);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
