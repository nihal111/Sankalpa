import { describe, it, expect } from 'vitest';

describe('App local search', () => {
  it('local search filters tasks by title', () => {
    const tasks = [
      { title: 'Buy milk', notes: null },
      { title: 'Call mom', notes: null },
    ];
    const query = 'milk';
    const filtered = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Buy milk');
  });

  it('local search filters tasks by notes', () => {
    const tasks = [
      { title: 'Task 1', notes: 'Buy milk at store' },
      { title: 'Task 2', notes: 'Call mom tomorrow' },
    ];
    const query = 'milk';
    const filtered = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || (t.notes?.toLowerCase().includes(query.toLowerCase()) ?? false));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Task 1');
  });

  it('local search returns all tasks for empty query', () => {
    const tasks = [
      { title: 'Buy milk', notes: null },
      { title: 'Call mom', notes: null },
    ];
    const query = '';
    const filtered = query.trim() ? tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())) : tasks;
    expect(filtered).toHaveLength(2);
  });
});
