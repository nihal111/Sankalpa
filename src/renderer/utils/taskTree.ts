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
