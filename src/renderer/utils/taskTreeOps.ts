import type { Task } from '../../shared/types';
import type { TaskWithDepth } from './taskTree';
import { calcSortKeyBetween } from '../../shared/sortKey';

export interface ReorderMutation {
  id: string;
  sortKey?: number;
  parentId?: string | null;
}

export interface ReorderResult {
  mutations: ReorderMutation[];
  newSelectedIndex: number;
}

/** Walk up the ancestor chain to find the task at the given depth. */
function getAncestorAtDepth(flatTask: TaskWithDepth, targetDepth: number, taskMap: Map<string, Task>): Task | undefined {
  let current = flatTask.task;
  let depth = flatTask.depth;
  while (depth > targetDepth && current.parent_id) {
    current = taskMap.get(current.parent_id)!;
    depth--;
  }
  return current;
}

/** Count visible flat rows occupied by a task at flatIndex (itself + visible descendants). */
function visibleSubtreeSize(flatTasks: TaskWithDepth[], flatIndex: number): number {
  const baseDepth = flatTasks[flatIndex].depth;
  let end = flatIndex + 1;
  while (end < flatTasks.length && flatTasks[end].depth > baseDepth) {
    end++;
  }
  return end - flatIndex;
}

/**
 * Compute mutations for reordering a task up or down in the tree.
 *
 * Rules:
 * - Moving among siblings: retain depth
 * - Moving up past parent: pop out to parent's depth, land above parent
 * - Moving down past last sibling: adopt depth of the task below
 * - If expanded: move only the single task (orphan children to task's parent)
 * - If collapsed: move entire subtree
 */
export function computeReorder(
  flatTasks: TaskWithDepth[],
  tasks: Task[],
  taskIndex: number,
  direction: -1 | 1,
): ReorderResult | null {
  if (flatTasks.length === 0) return null;
  const flatTask = flatTasks[taskIndex];
  if (!flatTask) return null;

  const task = flatTask.task;
  const isExpanded = !!task.is_expanded;
  const visibleSize = visibleSubtreeSize(flatTasks, taskIndex);
  const rangeEnd = taskIndex + visibleSize;
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  const orphanMutations = (): ReorderMutation[] => {
    if (!isExpanded) return [];
    return tasks.filter(t => t.parent_id === task.id).map(c => ({ id: c.id, parentId: task.parent_id }));
  };

  if (direction === -1) {
    if (taskIndex === 0) return null;
    const above = flatTasks[taskIndex - 1];

    const targetDepth = above.depth;
    const newParentId = targetDepth === 0 ? null
      : getAncestorAtDepth(above, targetDepth - 1, taskMap)!.id;

    const beforeAbove = taskIndex - 2 >= 0 ? flatTasks[taskIndex - 2].task.sort_key : null;
    const newSortKey = calcSortKeyBetween(beforeAbove, above.task.sort_key);

    return {
      mutations: [{ id: task.id, sortKey: newSortKey, parentId: newParentId }, ...orphanMutations()],
      newSelectedIndex: taskIndex - 1,
    };
  } else {
    if (rangeEnd >= flatTasks.length) return null;
    const below = flatTasks[rangeEnd];

    const targetDepth = below.depth;
    const belowSize = visibleSubtreeSize(flatTasks, rangeEnd);
    const belowEnd = rangeEnd + belowSize;

    const newParentId = targetDepth === 0 ? null
      : getAncestorAtDepth(below, targetDepth - 1, taskMap)!.id;

    const lastOfBelow = flatTasks[belowEnd - 1].task.sort_key;
    const afterBelow = belowEnd < flatTasks.length ? flatTasks[belowEnd].task.sort_key : null;
    const newSortKey = calcSortKeyBetween(lastOfBelow, afterBelow);

    return {
      mutations: [{ id: task.id, sortKey: newSortKey, parentId: newParentId }, ...orphanMutations()],
      newSelectedIndex: taskIndex + belowSize,
    };
  }
}
