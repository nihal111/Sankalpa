import type { ReactNode, RefObject } from 'react';
import type { Task } from '../shared/types';
import type { EditMode, Pane } from './types';

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDueDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface TasksPaneProps {
  tasks: Task[];
  selectedTaskIndex: number;
  focusedPane: Pane;
  editMode: EditMode;
  editValue: string;
  setEditValue: (v: string) => void;
  setEditMode: (m: EditMode) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  headerName: string;
  selectedTaskIndices: Set<number>;
  shiftHeld: boolean;
  cmdHeld: boolean;
  boundaryCursor: number | null;
  onTaskClick: (index: number) => void;
  onTaskToggle: (taskId: string) => void;
  flashIds: Set<string>;
  listNames?: Record<string, string>;
  dueDateIndex: number | null;
  onDueDateCommit: (value: string) => void;
  onDueDateCancel: () => void;
}

export function TasksPane({
  tasks,
  selectedTaskIndex,
  focusedPane,
  editMode,
  editValue,
  setEditValue,
  setEditMode,
  handleInputKeyDown,
  inputRef,
  headerName,
  selectedTaskIndices,
  shiftHeld,
  cmdHeld,
  boundaryCursor,
  onTaskClick,
  onTaskToggle,
  flashIds,
  listNames,
  dueDateIndex,
  onDueDateCommit,
  onDueDateCancel,
}: TasksPaneProps): ReactNode {
  return (
    <div className={`pane tasks-pane ${focusedPane === 'tasks' ? 'focused' : ''}`}>
      <h2>{headerName}</h2>
      <ul className="item-list">
        {tasks.map((task, i) => (
          <li
            key={task.id}
            className={`item task-item ${task.status === 'COMPLETED' ? 'completed' : ''} ${i === selectedTaskIndex && !cmdHeld ? 'selected' : ''} ${selectedTaskIndices.has(i) ? 'multi-selected' : ''} ${shiftHeld && i === selectedTaskIndex ? 'cursor' : ''} ${cmdHeld && i === boundaryCursor ? 'cursor' : ''} ${flashIds.has(task.id) ? 'flash' : ''}`}
            onClick={() => onTaskClick(i)}
          >
            <input
              type="checkbox"
              checked={task.status === 'COMPLETED'}
              onChange={() => onTaskToggle(task.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`mark ${task.title || 'untitled task'} as complete`}
            />
            {editMode?.type === 'task' && editMode.index === i ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={() => setEditMode(null)}
                className="edit-input"
              />
            ) : (
              task.title || '\u00A0'
            )}
            {dueDateIndex === i ? (
              <input
                type="datetime-local"
                className="due-date-input"
                defaultValue={task.due_date ? toDatetimeLocal(task.due_date) : ''}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onDueDateCommit(e.currentTarget.value); } }}
                onBlur={() => onDueDateCancel()}
              />
            ) : task.due_date ? (
              <span className={`task-due-date${task.due_date < Date.now() && task.status === 'PENDING' ? ' overdue' : ''}`}>{formatDueDate(task.due_date)}</span>
            ) : null}
            {listNames && <span className="task-origin">{task.list_id ? listNames[task.list_id] || 'Inbox' : 'Inbox'}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
