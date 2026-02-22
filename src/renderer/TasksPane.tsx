import type { ReactNode, RefObject } from 'react';
import type { Task, List } from '../shared/types';
import type { EditMode, Pane, CompletedFilter } from './types';
import type { TaskWithDepth } from './utils/taskTree';
import { CompletedFilterBar } from './CompletedFilterBar';
import { hasChildren } from './utils/taskTree';

function formatDueDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface TasksPaneProps {
  tasks: Task[];
  flatTasks: TaskWithDepth[];
  selectedTaskIndex: number;
  focusedPane: Pane;
  editMode: EditMode;
  editValue: string;
  setEditValue: (v: string) => void;
  setEditMode: (m: EditMode) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleEditBlur: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  headerName: string;
  selectedTaskIndices: Set<number>;
  shiftHeld: boolean;
  cmdHeld: boolean;
  boundaryCursor: number | null;
  onTaskClick: (index: number) => void;
  onTaskContextMenu: (index: number, x: number, y: number) => void;
  onTaskToggle: (taskId: string) => void;
  flashIds: Set<string>;
  throbIds: Set<string>;
  completeIds: Set<string>;
  uncompleteIds: Set<string>;
  moveIds: Set<string>;
  evaporateIds: Set<string>;
  listNames?: Record<string, string>;
  showSourceList?: boolean;
  lists?: List[];
  completedFilter?: CompletedFilter;
  onFilterChange?: (filter: CompletedFilter) => void;
  listsWithCompletedTasks?: List[];
  dragOverIndex?: number | null;
  dropPosition?: 'before' | 'after' | null;
  taskDragProps?: (index: number) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}

export function TasksPane({
  tasks,
  flatTasks,
  selectedTaskIndex,
  focusedPane,
  editMode,
  editValue,
  setEditValue,
  handleInputKeyDown,
  handleEditBlur,
  inputRef,
  headerName,
  selectedTaskIndices,
  shiftHeld,
  cmdHeld,
  boundaryCursor,
  onTaskClick,
  onTaskContextMenu,
  onTaskToggle,
  flashIds,
  throbIds,
  completeIds,
  uncompleteIds,
  moveIds,
  evaporateIds,
  listNames,
  showSourceList,
  lists,
  completedFilter,
  onFilterChange,
  listsWithCompletedTasks,
  dragOverIndex,
  dropPosition,
  taskDragProps,
}: TasksPaneProps): ReactNode {
  const getSourceListName = (task: Task): string | null => {
    if (!showSourceList || !lists) return null;
    if (!task.list_id) return 'Inbox';
    const list = lists.find((l) => l.id === task.list_id);
    return list?.name ?? null;
  };

  const getTreeConnector = (flatTask: TaskWithDepth): string => {
    if (flatTask.depth === 0) return '';
    const parts: string[] = [];
    for (let d = 0; d < flatTask.depth - 1; d++) {
      parts.push(flatTask.ancestorIsLast[d] ? '\u00A0\u00A0\u00A0' : '│\u00A0\u00A0');
    }
    parts.push(flatTask.isLastChild ? '└─\u00A0' : '├─\u00A0');
    return parts.join('');
  };

  const getCollapseIndicator = (task: Task): string | null => {
    if (!hasChildren(task.id, tasks)) return null;
    return task.is_expanded ? '▼' : '▶';
  };

  const getChildCount = (task: Task): number => {
    if (task.is_expanded) return 0;
    let count = 0;
    const stack = [task.id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      for (const t of tasks) {
        if (t.parent_id === id) {
          count++;
          stack.push(t.id);
        }
      }
    }
    return count;
  };

  return (
    <div className={`pane tasks-pane ${focusedPane === 'tasks' ? 'focused' : ''}`}>
      <h2>{headerName}</h2>
      {completedFilter && onFilterChange && listsWithCompletedTasks && (
        <CompletedFilterBar
          filter={completedFilter}
          onFilterChange={onFilterChange}
          listsWithCompletedTasks={listsWithCompletedTasks}
        />
      )}
      <ul className="item-list">
        {flatTasks.map((flatTask, i) => {
          const task = flatTask.task;
          const sourceListName = getSourceListName(task);
          const connector = getTreeConnector(flatTask);
          const collapseIndicator = getCollapseIndicator(task);
          const childCount = getChildCount(task);
          const drag = taskDragProps?.(i);
          return (
            <li
              key={task.id}
              className={`item task-item ${task.status === 'COMPLETED' ? 'completed' : ''} ${i === selectedTaskIndex && !cmdHeld ? 'selected' : ''} ${selectedTaskIndices.has(i) ? 'multi-selected' : ''} ${shiftHeld && i === selectedTaskIndex ? 'cursor' : ''} ${cmdHeld && i === boundaryCursor ? 'cursor' : ''} ${flashIds.has(task.id) ? 'flash' : ''} ${throbIds.has(task.id) ? 'throb' : ''} ${completeIds.has(task.id) ? 'completing' : ''} ${uncompleteIds.has(task.id) ? 'uncompleting' : ''} ${moveIds.has(task.id) ? 'moved' : ''} ${evaporateIds.has(task.id) ? 'evaporating' : ''} ${dragOverIndex === i && dropPosition === 'before' ? 'drag-over-before' : ''} ${dragOverIndex === i && dropPosition === 'after' ? 'drag-over-after' : ''}`}
              onClick={() => onTaskClick(i)}
              onContextMenu={(e) => { e.preventDefault(); onTaskContextMenu(i, e.clientX, e.clientY); }}
              {...drag}
            >
              {connector && <span className="tree-connector">{connector}</span>}
              {collapseIndicator && <span className="collapse-indicator">{collapseIndicator}</span>}
              <input
                type="checkbox"
                checked={task.status === 'COMPLETED'}
                onChange={() => onTaskToggle(task.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`mark ${task.title || 'untitled task'} as complete`}
              />
              <span className="task-content">
                {editMode?.type === 'task' && editMode.index === i ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={handleEditBlur}
                    className="edit-input"
                  />
                ) : (
                  <>
                    {task.title || '\u00A0'}
                    {childCount > 0 && <span className="child-count">({childCount})</span>}
                  </>
                )}
                {sourceListName && <span className="task-source-list">{sourceListName}</span>}
              </span>
              {task.due_date ? (
                <span className={`task-due-date${task.due_date < Date.now() && task.status === 'PENDING' ? ' overdue' : ''}`}>{formatDueDate(task.due_date)}</span>
              ) : null}
              {listNames && <span className="task-origin">{task.list_id ? listNames[task.list_id] || 'Inbox' : 'Inbox'}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
