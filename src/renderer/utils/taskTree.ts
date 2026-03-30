import type { Task } from '../../shared/types';

export interface TaskWithDepth {
  task: Task;
  depth: number;
  isLastChild: boolean;
  ancestorIsLast: boolean[];
  effectiveParentId: string | null;
}

export function getTaskDepth(task: Task, taskMap: Map<string, Task>): number {
  let depth = 0;
  let current = task;
  while (current.parent_id) {
    const parent = taskMap.get(current.parent_id);
    if (!parent) break;
    depth++;
    current = parent;
  }
  return depth;
}

export function flattenWithDepth(tasks: Task[], preserveOrder = false): TaskWithDepth[] {
  const taskIds = new Set(tasks.map(t => t.id));
  const childrenMap = new Map<string | null, Task[]>();

  for (const task of tasks) {
    const parentId = task.parent_id && taskIds.has(task.parent_id) ? task.parent_id : null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(task);
  }

  if (!preserveOrder) {
    // Sort children by sort_key within each parent group
    for (const children of childrenMap.values()) {
      children.sort((a, b) => a.sort_key - b.sort_key);
    }
  }

  const result: TaskWithDepth[] = [];
  const collapsedIds = new Set(tasks.filter(t => !t.is_expanded).map(t => t.id));

  function traverse(parentId: string | null, depth: number, ancestorIsLast: boolean[]): void {
    const children = childrenMap.get(parentId) ?? [];
    children.forEach((task, i) => {
      const isLastChild = i === children.length - 1;
      result.push({ task, depth, isLastChild, ancestorIsLast: [...ancestorIsLast], effectiveParentId: parentId });
      if (!collapsedIds.has(task.id)) {
        traverse(task.id, depth + 1, [...ancestorIsLast, isLastChild]);
      }
    });
  }

  traverse(null, 0, []);
  return result;
}

export function getDescendantIds(taskId: string, tasks: Task[]): string[] {
  const childrenMap = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const parentId = task.parent_id;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(task);
  }

  const result: string[] = [];
  function collect(id: string): void {
    const children = childrenMap.get(id) ?? [];
    for (const child of children) {
      result.push(child.id);
      collect(child.id);
    }
  }
  collect(taskId);
  return result;
}

export function findValidParent(taskAbove: Task | undefined, _taskMap: Map<string, Task>): string | null {
  if (!taskAbove) return null;
  return taskAbove.id;
}

export function canIndent(taskIndex: number, flatTasks: TaskWithDepth[]): boolean {
  if (taskIndex === 0) return false;
  const current = flatTasks[taskIndex];
  const above = flatTasks[taskIndex - 1];
  return above.depth >= current.depth;
}

export function canOutdent(taskIndex: number, flatTasks: TaskWithDepth[]): boolean {
  return flatTasks[taskIndex].depth > 0;
}

export function hasChildren(taskId: string, tasks: Task[]): boolean {
  return tasks.some(t => t.parent_id === taskId);
}

export interface CompletedSection {
  incomplete: TaskWithDepth[];
  completed: TaskWithDepth[];
}

/** Split flat tasks into incomplete and fully-completed root subtrees.
 *  A root subtree is "fully completed" when the root AND every descendant has status === 'COMPLETED'.
 *  Completed subtrees are sorted by root's completed_timestamp descending (most recent first). */
export function partitionByCompletion(flatTasks: TaskWithDepth[], tasks: Task[]): CompletedSection {
  // Build set of all task ids with incomplete status
  const incompleteIds = new Set(tasks.filter(t => t.status !== 'COMPLETED').map(t => t.id));

  // Build parent→children map to check descendants
  const childrenMap = new Map<string, string[]>();
  for (const t of tasks) {
    if (t.parent_id) {
      if (!childrenMap.has(t.parent_id)) childrenMap.set(t.parent_id, []);
      childrenMap.get(t.parent_id)!.push(t.id);
    }
  }

  // Check if a task and all descendants are completed
  function isFullyCompleted(id: string): boolean {
    if (incompleteIds.has(id)) return false;
    const children = childrenMap.get(id);
    if (!children) return true;
    return children.every(isFullyCompleted);
  }

  // Identify which root tasks are fully completed
  const completedRoots = new Set<string>();
  for (const ft of flatTasks) {
    if (ft.depth === 0 && isFullyCompleted(ft.task.id)) {
      completedRoots.add(ft.task.id);
    }
  }

  if (completedRoots.size === 0) return { incomplete: flatTasks, completed: [] };

  // Track which root each flat task belongs to
  const incomplete: TaskWithDepth[] = [];
  const completed: TaskWithDepth[] = [];
  let currentRoot: string | null = null;
  let currentIsCompleted = false;

  for (const ft of flatTasks) {
    if (ft.depth === 0) {
      currentRoot = ft.task.id;
      currentIsCompleted = completedRoots.has(currentRoot);
    }
    (currentIsCompleted ? completed : incomplete).push(ft);
  }

  // Sort completed subtrees by root's completed_timestamp descending
  // Group by root, sort groups, flatten
  const groups: TaskWithDepth[][] = [];
  let group: TaskWithDepth[] = [];
  for (const ft of completed) {
    if (ft.depth === 0 && group.length > 0) { groups.push(group); group = []; }
    group.push(ft);
  }
  if (group.length > 0) groups.push(group);
  groups.sort((a, b) => (b[0].task.completed_timestamp ?? 0) - (a[0].task.completed_timestamp ?? 0));

  return { incomplete, completed: groups.flat() };
}
