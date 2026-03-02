import { describe, it, expect } from 'vitest';
import type { Task } from '../../shared/types';
import {
  getTaskDepth,
  flattenWithDepth,
  getDescendantIds,
  findValidParent,
  canIndent,
  canOutdent,
  hasChildren,
} from './taskTree';

const makeTask = (id: string, parent_id: string | null = null, is_expanded = 1): Task => ({
  id,
  list_id: 'list1',
  title: `Task ${id}`,
  status: 'PENDING',
  sort_key: parseInt(id),
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

describe('getTaskDepth', () => {
  it('returns 0 for root task', () => {
    const task = makeTask('1');
    const taskMap = new Map([[task.id, task]]);
    expect(getTaskDepth(task, taskMap)).toBe(0);
  });

  it('returns 1 for child of root', () => {
    const parent = makeTask('1');
    const child = makeTask('2', '1');
    const taskMap = new Map([
      [parent.id, parent],
      [child.id, child],
    ]);
    expect(getTaskDepth(child, taskMap)).toBe(1);
  });

  it('returns 2 for grandchild', () => {
    const root = makeTask('1');
    const child = makeTask('2', '1');
    const grandchild = makeTask('3', '2');
    const taskMap = new Map([
      [root.id, root],
      [child.id, child],
      [grandchild.id, grandchild],
    ]);
    expect(getTaskDepth(grandchild, taskMap)).toBe(2);
  });

  it('returns depth for deeply nested task', () => {
    const t1 = makeTask('1');
    const t2 = makeTask('2', '1');
    const t3 = makeTask('3', '2');
    const t4 = makeTask('4', '3');
    const taskMap = new Map([
      [t1.id, t1],
      [t2.id, t2],
      [t3.id, t3],
      [t4.id, t4],
    ]);
    expect(getTaskDepth(t4, taskMap)).toBe(3);
  });

  it('stops at missing parent', () => {
    const child = makeTask('2', 'missing');
    const taskMap = new Map([[child.id, child]]);
    expect(getTaskDepth(child, taskMap)).toBe(0);
  });
});

describe('flattenWithDepth', () => {
  it('returns empty array for empty input', () => {
    expect(flattenWithDepth([])).toEqual([]);
  });

  it('flattens single root task', () => {
    const task = makeTask('1');
    const result = flattenWithDepth([task]);
    expect(result).toHaveLength(1);
    expect(result[0].task.id).toBe('1');
    expect(result[0].depth).toBe(0);
  });

  it('flattens parent-child hierarchy', () => {
    const parent = makeTask('1');
    const child = makeTask('2', '1');
    const result = flattenWithDepth([parent, child]);
    expect(result).toHaveLength(2);
    expect(result[0].task.id).toBe('1');
    expect(result[0].depth).toBe(0);
    expect(result[1].task.id).toBe('2');
    expect(result[1].depth).toBe(1);
  });

  it('hides children when parent is collapsed', () => {
    const parent = makeTask('1', null, 0);
    const child = makeTask('2', '1');
    const result = flattenWithDepth([parent, child]);
    expect(result).toHaveLength(1);
    expect(result[0].task.id).toBe('1');
  });

  it('sets isLastChild correctly', () => {
    const t1 = makeTask('1');
    const t2 = makeTask('2');
    const result = flattenWithDepth([t1, t2]);
    expect(result[0].isLastChild).toBe(false);
    expect(result[1].isLastChild).toBe(true);
  });

  it('treats orphaned subtasks as root-level', () => {
    const child = makeTask('2', 'missing-parent');
    const result = flattenWithDepth([child]);
    expect(result).toHaveLength(1);
    expect(result[0].depth).toBe(0);
  });
});

describe('getDescendantIds', () => {
  it('returns empty for task with no children', () => {
    const task = makeTask('1');
    expect(getDescendantIds('1', [task])).toEqual([]);
  });

  it('returns direct children', () => {
    const parent = makeTask('1');
    const child = makeTask('2', '1');
    const ids = getDescendantIds('1', [parent, child]);
    expect(ids).toEqual(['2']);
  });

  it('returns all descendants recursively', () => {
    const t1 = makeTask('1');
    const t2 = makeTask('2', '1');
    const t3 = makeTask('3', '2');
    const ids = getDescendantIds('1', [t1, t2, t3]);
    expect(ids).toContain('2');
    expect(ids).toContain('3');
  });
});

describe('findValidParent', () => {
  it('returns null when no task above', () => {
    expect(findValidParent(undefined, new Map())).toBeNull();
  });

  it('returns task id when task above is not at max depth', () => {
    const task = makeTask('1');
    const taskMap = new Map([[task.id, task]]);
    expect(findValidParent(task, taskMap)).toBe('1');
  });

  it('returns task id for any task above', () => {
    const t1 = makeTask('1');
    const t2 = makeTask('2', '1');
    const t3 = makeTask('3', '2');
    const taskMap = new Map([
      [t1.id, t1],
      [t2.id, t2],
      [t3.id, t3],
    ]);
    expect(findValidParent(t3, taskMap)).toBe('3');
  });
});

describe('canIndent', () => {
  it('returns false for first task', () => {
    const task = makeTask('1');
    const flat = flattenWithDepth([task]);
    expect(canIndent(0, flat)).toBe(false);
  });

  it('returns true when task above is at same or greater depth', () => {
    const t1 = makeTask('1');
    const t2 = makeTask('2');
    const flat = flattenWithDepth([t1, t2]);
    expect(canIndent(1, flat)).toBe(true);
  });

  it('returns true when at any depth if task above is at same or greater depth', () => {
    const t1 = makeTask('1');
    const t2 = makeTask('2', '1');
    const t3 = makeTask('3', '2');
    const t4 = makeTask('4', '2');
    const flat = flattenWithDepth([t1, t2, t3, t4]);
    expect(canIndent(3, flat)).toBe(true);
  });
});

describe('canOutdent', () => {
  it('returns false for root task', () => {
    const task = makeTask('1');
    const flat = flattenWithDepth([task]);
    expect(canOutdent(0, flat)).toBe(false);
  });

  it('returns true for nested task', () => {
    const parent = makeTask('1');
    const child = makeTask('2', '1');
    const flat = flattenWithDepth([parent, child]);
    expect(canOutdent(1, flat)).toBe(true);
  });
});

describe('hasChildren', () => {
  it('returns false when no children', () => {
    const task = makeTask('1');
    expect(hasChildren('1', [task])).toBe(false);
  });

  it('returns true when has children', () => {
    const parent = makeTask('1');
    const child = makeTask('2', '1');
    expect(hasChildren('1', [parent, child])).toBe(true);
  });
});
