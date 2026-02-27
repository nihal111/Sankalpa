import { describe, it, expect } from 'vitest';
import type { Task } from '../../shared/types';
import { flattenWithDepth } from './taskTree';

function makeTask(id: string, parentId: string | null = null, expanded = true): Task {
  return {
    id, list_id: null, title: id, status: 'PENDING', created_timestamp: 0,
    completed_timestamp: null, due_date: null, notes: null, sort_key: 0,
    created_at: 0, updated_at: 0, deleted_at: null, parent_id: parentId,
    is_expanded: expanded ? 1 : 0,
  };
}

describe('flattenWithDepth', () => {
  it('returns root tasks at depth 0', () => {
    const result = flattenWithDepth([makeTask('a'), makeTask('b')]);
    expect(result.map(r => [r.task.id, r.depth])).toEqual([['a', 0], ['b', 0]]);
  });

  it('nests children under their parent', () => {
    const result = flattenWithDepth([makeTask('p'), makeTask('c', 'p')]);
    expect(result.map(r => [r.task.id, r.depth])).toEqual([['p', 0], ['c', 1]]);
  });

  it('treats orphaned subtasks as root-level', () => {
    const child = makeTask('c', 'missing-parent');
    const result = flattenWithDepth([child]);
    expect(result).toHaveLength(1);
    expect(result[0].depth).toBe(0);
  });

  it('mixes orphaned subtasks with normal root tasks', () => {
    const result = flattenWithDepth([makeTask('a'), makeTask('orphan', 'missing')]);
    expect(result.map(r => [r.task.id, r.depth])).toEqual([['a', 0], ['orphan', 0]]);
  });

  it('hides children of collapsed parents', () => {
    const result = flattenWithDepth([makeTask('p', null, false), makeTask('c', 'p')]);
    expect(result.map(r => r.task.id)).toEqual(['p']);
  });

  it('shows orphaned subtask even if its missing parent would be collapsed', () => {
    const child = makeTask('c', 'missing');
    const result = flattenWithDepth([child]);
    expect(result).toHaveLength(1);
    expect(result[0].task.id).toBe('c');
  });
});
