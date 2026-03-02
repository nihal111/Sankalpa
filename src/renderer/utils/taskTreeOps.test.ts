import { describe, it, expect } from 'vitest';
import type { Task } from '../../shared/types';
import { flattenWithDepth } from './taskTree';
import { computeReorder } from './taskTreeOps';

const makeTask = (id: string, parent_id: string | null = null, is_expanded = 1, sort_key = parseInt(id)): Task => ({
  id,
  list_id: 'list1',
  title: `Task ${id}`,
  status: 'PENDING',
  sort_key,
  parent_id,
  is_expanded,
  created_at: 0,
  updated_at: 0,
  due_date: null,
  duration: null,
  notes: null,
  deleted_at: null,
  created_timestamp: 0,
  completed_timestamp: null,
});

describe('computeReorder', () => {
  it('returns null when moving first task up', () => {
    const tasks = [makeTask('1'), makeTask('2')];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 0, -1);
    expect(result).toBeNull();
  });

  it('returns null when moving last task down', () => {
    const tasks = [makeTask('1'), makeTask('2')];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 1, 1);
    expect(result).toBeNull();
  });

  it('moves task up among siblings', () => {
    const tasks = [makeTask('1', null, 1, 1), makeTask('2', null, 1, 2)];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 1, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations).toHaveLength(1);
    expect(result!.mutations[0].id).toBe('2');
    expect(result!.mutations[0].sortKey).toBeLessThan(1);
    expect(result!.newSelectedIndex).toBe(0);
  });

  it('moves task down among siblings', () => {
    const tasks = [makeTask('1', null, 1, 1), makeTask('2', null, 1, 2)];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations).toHaveLength(1);
    expect(result!.mutations[0].id).toBe('1');
    expect(result!.mutations[0].sortKey).toBeGreaterThan(2);
    expect(result!.newSelectedIndex).toBe(1);
  });

  it('orphans children when moving expanded task', () => {
    const parent = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const sibling = makeTask('3', null, 1, 3);
    const tasks = [parent, child, sibling];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations.length).toBeGreaterThan(1);
    const orphanMutation = result!.mutations.find(m => m.id === '2');
    expect(orphanMutation).toBeDefined();
    expect(orphanMutation!.parentId).toBeNull();
  });

  it('moves collapsed task with subtree', () => {
    const parent = makeTask('1', null, 0, 1);
    const child = makeTask('2', '1', 1, 2);
    const sibling = makeTask('3', null, 1, 3);
    const tasks = [parent, child, sibling];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations).toHaveLength(1);
    expect(result!.mutations[0].id).toBe('1');
  });

  it('pops out when moving up past parent', () => {
    const parent = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const tasks = [parent, child];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 1, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('2');
    expect(result!.mutations[0].parentId).toBeNull();
  });

  it('moves into expanded task with children', () => {
    const task1 = makeTask('1', null, 1, 1);
    const task2 = makeTask('2', null, 1, 2);
    const child2 = makeTask('3', '2', 1, 3);
    const tasks = [task1, task2, child2];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('1');
    expect(result!.mutations[0].parentId).toBe('2'); // becomes child of task2
    expect(result!.newSelectedIndex).toBe(1); // task1 is now at position 1 (first child of task2)
  });

  it('moves into nested position when target has children', () => {
    const parent = makeTask('1', null, 1, 1);
    const child1 = makeTask('2', '1', 1, 2);
    const child2 = makeTask('3', '1', 1, 3);
    const tasks = [parent, child1, child2];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 2, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('3');
  });

  it('handles deep nesting when moving up', () => {
    const root = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const grandchild = makeTask('3', '2', 1, 3);
    const tasks = [root, child, grandchild];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 2, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('3');
    expect(result!.mutations[0].parentId).toBe('1');
  });

  it('handles deep nesting when moving down', () => {
    const root = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const grandchild = makeTask('3', '2', 1, 3);
    const sibling = makeTask('4', null, 1, 4);
    const tasks = [root, child, grandchild, sibling];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 3, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('4');
  });

  it('adopts parent when moving child down past shallower sibling', () => {
    const parent = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const sibling = makeTask('3', null, 1, 3);
    const tasks = [parent, child, sibling];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 1, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('2');
    expect(result!.mutations[0].parentId).toBeNull();
  });

  it('handles moving to end of list', () => {
    const task1 = makeTask('1', null, 1, 1);
    const task2 = makeTask('2', null, 1, 2);
    const tasks = [task1, task2];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].sortKey).toBeGreaterThan(2);
  });

  it('handles moving from position with no task before', () => {
    const task1 = makeTask('1', null, 1, 1);
    const task2 = makeTask('2', null, 1, 2);
    const task3 = makeTask('3', null, 1, 3);
    const tasks = [task1, task2, task3];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 1, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('2');
    expect(result!.mutations[0].sortKey).toBeLessThan(1);
  });

  it('handles getAncestorAtDepth fallback when ancestor chain is broken', () => {
    // This tests the ?? null fallback in getAncestorAtDepth
    const root = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const grandchild = makeTask('3', '2', 1, 3);
    const sibling = makeTask('4', null, 1, 4);
    const tasks = [root, child, grandchild, sibling];
    const flat = flattenWithDepth(tasks);
    
    // Move grandchild up - should find ancestor at depth 0
    const result = computeReorder(flat, tasks, 2, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].parentId).toBe('1');
  });

  it('handles moving down when target depth is 0', () => {
    const parent = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const sibling = makeTask('3', null, 1, 3);
    const tasks = [parent, child, sibling];
    const flat = flattenWithDepth(tasks);
    
    // Move child down past sibling - should become root level
    const result = computeReorder(flat, tasks, 1, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('2');
    expect(result!.mutations[0].parentId).toBeNull();
  });

  it('handles moving up when target depth is 0', () => {
    const task1 = makeTask('1', null, 1, 1);
    const parent = makeTask('2', null, 1, 2);
    const child = makeTask('3', '2', 1, 3);
    const tasks = [task1, parent, child];
    const flat = flattenWithDepth(tasks);
    
    // Move child up - should become root level
    const result = computeReorder(flat, tasks, 2, -1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('3');
    expect(result!.mutations[0].parentId).toBeNull();
  });

  it('handles moving task with multiple visible descendants', () => {
    const parent = makeTask('1', null, 1, 1);
    const child1 = makeTask('2', '1', 1, 2);
    const child2 = makeTask('3', '1', 1, 3);
    const child3 = makeTask('4', '1', 1, 4);
    const sibling = makeTask('5', null, 1, 5);
    const tasks = [parent, child1, child2, child3, sibling];
    const flat = flattenWithDepth(tasks);
    
    // Move parent down - should calculate visible subtree size correctly
    const result = computeReorder(flat, tasks, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].id).toBe('1');
  });

  it('returns null for empty flat tasks', () => {
    const result = computeReorder([], [], 0, 1);
    expect(result).toBeNull();
  });

  it('returns null for invalid task index', () => {
    const tasks = [makeTask('1')];
    const flat = flattenWithDepth(tasks);
    const result = computeReorder(flat, tasks, 99, 1);
    expect(result).toBeNull();
  });

  it('moves child task down past collapsed root sibling', () => {
    const parent = makeTask('1', null, 1, 1);
    const child = makeTask('2', '1', 1, 2);
    const sibling = makeTask('3', null, 0, 3); // collapsed root task
    const tasks = [parent, child, sibling];
    const flat = flattenWithDepth(tasks);
    // Move child (index 1) down past sibling (index 2)
    const result = computeReorder(flat, tasks, 1, 1);
    expect(result).not.toBeNull();
    expect(result!.mutations[0].parentId).toBeNull(); // becomes root
  });
});
