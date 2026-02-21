import type { ReactNode } from 'react';
import type { Task } from '../shared/types';
import type { Pane } from './types';

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDueDate(ms: number | null): string {
  if (!ms) return 'None';
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatCreatedDate(ms: number): string {
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `Created ${date} at ${time}`;
}

interface TaskDetailPaneProps {
  task: Task | null;
  focusedPane: Pane;
  onEditTitle: () => void;
  onEditDueDate: () => void;
  dueDateEditing: boolean;
  onDueDateCommit: (value: string) => void;
}

export function TaskDetailPane({
  task,
  focusedPane,
  onEditTitle,
  onEditDueDate,
  dueDateEditing,
  onDueDateCommit,
}: TaskDetailPaneProps): ReactNode {
  if (!task) return null;

  return (
    <div className={`pane detail-pane ${focusedPane === 'detail' ? 'focused' : ''}`}>
      <div className="detail-section detail-title" onClick={onEditTitle}>
        <span className="detail-label">{task.title || 'Untitled'}</span>
        <span className="hotkey-badge">E</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section" onClick={onEditDueDate}>
        <span className="detail-icon">🔔</span>
        <span className="detail-label">
          {dueDateEditing ? (
            <input
              type="datetime-local"
              className="due-date-input"
              defaultValue={task.due_date ? toDatetimeLocal(task.due_date) : ''}
              autoFocus
              onBlur={(e) => onDueDateCommit(e.currentTarget.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            formatDueDate(task.due_date)
          )}
        </span>
        <span className="hotkey-badge">D</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section">
        <span className="detail-icon">🏷️</span>
        <span className="detail-label">Labels</span>
        <span className="hotkey-badge">L</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section">
        <span className="detail-icon">📎</span>
        <span className="detail-label">Attachments</span>
        <span className="hotkey-badge">A</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section">
        <span className="detail-icon">📄</span>
        <span className="detail-label">Notes</span>
        <span className="hotkey-badge">N</span>
      </div>
      <div className="detail-created">{formatCreatedDate(task.created_timestamp)}</div>
    </div>
  );
}
