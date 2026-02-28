import { describe, it, expect } from 'vitest';
import { computeDuplicate } from './taskTreeOps';
import type { Task } from '../../shared/types';

const baseTask: Task = {
  id: 'task-1',
  list_id: '1',
  title: 'Task 1',
  status: 'ACTIVE',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  sort_key: 1,
  parent_id: null,
  is_expanded: true,
  due_date: null,
  notes: '',
  duration_minutes: null,
};

describe('computeDuplicate', () => {
  it('duplicates single expanded task', () => {
    const task: Task = { ...baseTask, is_expanded: true };
    const specs = computeDuplicate(task, []);
    
    expect(specs).toHaveLength(1);
    expect(specs[0].task).toBe(task);
    expect(specs[0].newId).toBeTruthy();
    expect(specs[0].newParentId).toBe(null);
  });

  it('duplicates collapsed task with children', () => {
    const parent: Task = { ...baseTask, id: 'p', is_expanded: false };
    const child1: Task = { ...baseTask, id: 'c1', parent_id: 'p' };
    const child2: Task = { ...baseTask, id: 'c2', parent_id: 'p' };
    const allTasks = [parent, child1, child2];
    
    const specs = computeDuplicate(parent, allTasks);
    
    expect(specs).toHaveLength(3);
    expect(specs[0].task.id).toBe('p');
    expect(specs[1].task.id).toBe('c1');
    expect(specs[2].task.id).toBe('c2');
    expect(specs[1].newParentId).toBe(specs[0].newId);
    expect(specs[2].newParentId).toBe(specs[0].newId);
  });

  it('duplicates collapsed task with nested descendants', () => {
    const root: Task = { ...baseTask, id: 'r', is_expanded: false };
    const child: Task = { ...baseTask, id: 'c', parent_id: 'r' };
    const grandchild: Task = { ...baseTask, id: 'gc', parent_id: 'c' };
    const allTasks = [root, child, grandchild];
    
    const specs = computeDuplicate(root, allTasks);
    
    expect(specs).toHaveLength(3);
    expect(specs[0].task.id).toBe('r');
    expect(specs[1].task.id).toBe('c');
    expect(specs[2].task.id).toBe('gc');
    expect(specs[1].newParentId).toBe(specs[0].newId);
    expect(specs[2].newParentId).toBe(specs[1].newId);
  });

  it('preserves parent_id for root task', () => {
    const task: Task = { ...baseTask, parent_id: 'parent-x', is_expanded: false };
    const specs = computeDuplicate(task, []);
    
    expect(specs[0].newParentId).toBe('parent-x');
  });

  it('generates unique IDs for all duplicated tasks', () => {
    const parent: Task = { ...baseTask, id: 'p', is_expanded: false };
    const child1: Task = { ...baseTask, id: 'c1', parent_id: 'p' };
    const child2: Task = { ...baseTask, id: 'c2', parent_id: 'p' };
    const allTasks = [parent, child1, child2];
    
    const specs = computeDuplicate(parent, allTasks);
    const ids = specs.map(s => s.newId);
    
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(id => id !== 'p' && id !== 'c1' && id !== 'c2')).toBe(true);
  });

  it('does not duplicate siblings of collapsed task', () => {
    const parent: Task = { ...baseTask, id: 'p', is_expanded: false };
    const child: Task = { ...baseTask, id: 'c', parent_id: 'p' };
    const sibling: Task = { ...baseTask, id: 's', parent_id: null };
    const allTasks = [parent, child, sibling];
    
    const specs = computeDuplicate(parent, allTasks);
    
    expect(specs).toHaveLength(2);
    expect(specs.find(s => s.task.id === 's')).toBeUndefined();
  });

  it('remaps parent IDs correctly for P->C->G hierarchy', () => {
    const p: Task = { ...baseTask, id: 'P', is_expanded: false, parent_id: null };
    const c: Task = { ...baseTask, id: 'C', parent_id: 'P' };
    const g: Task = { ...baseTask, id: 'G', parent_id: 'C' };
    const allTasks = [p, c, g];
    
    const specs = computeDuplicate(p, allTasks);
    
    expect(specs).toHaveLength(3);
    // P' should have no parent
    expect(specs[0].newParentId).toBe(null);
    // C' should have P' as parent
    expect(specs[1].newParentId).toBe(specs[0].newId);
    // G' should have C' as parent
    expect(specs[2].newParentId).toBe(specs[1].newId);
  });
});
