import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Task } from '../shared/types';
import type { Pane } from './types';
import { marked } from 'marked';
import { formatDueDate as formatDueDateBase } from './utils/formatDueDate';

function formatDueDate(ms: number | null): string {
  if (!ms) return 'Set due date';
  return formatDueDateBase(ms);
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'Set duration';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
  }
  const d = Math.floor(minutes / (24 * 60));
  return `${d} day${d > 1 ? 's' : ''}`;
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
  selectedCount: number;
  tasksLength: number;
  onEditTitle: () => void;
  onEditDueDate: () => void;
  onEditDuration: () => void;
  onStartNotesEdit: () => void;
}

export function TaskDetailPane({
  task,
  focusedPane,
  selectedCount,
  tasksLength,
  onEditTitle,
  onEditDueDate,
  onEditDuration,
  onStartNotesEdit,
}: TaskDetailPaneProps): ReactNode {
  const renderedNotes = useMemo(() => {
    if (!task?.notes) return '';
    return marked.parse(task.notes, { async: false }) as string;
  }, [task?.notes]);

  const emptyMessage = useMemo((): string | null => {
    if (selectedCount > 1) return `${selectedCount} tasks selected`;
    if (tasksLength === 0) return 'No tasks in section';
    if (!task) return 'No task selected';
    return null;
  }, [selectedCount, tasksLength, task]);

  if (emptyMessage) {
    return (
      <div className="pane detail-pane">
        <div className="detail-empty">{emptyMessage}</div>
      </div>
    );
  }

  const t = task!;

  return (
    <div className={`pane detail-pane ${focusedPane === 'detail' ? 'focused' : ''}`}>
      <div className="detail-section detail-title" onClick={onEditTitle}>
        <span className="detail-label">{t.title || 'Untitled'}</span>
        <span className="hotkey-badge">E</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section" onClick={onEditDueDate}>
        <span className="detail-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.268 21a2 2 0 003.464 0"/><path d="M3.262 15.326A1 1 0 004 17h16a1 1 0 00.74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 006 8c0 4.499-1.411 5.956-2.738 7.326"/></svg></span>
        <span className="detail-label">
          {formatDueDate(t.due_date)}
        </span>
        <span className="hotkey-badge">D</span>
      </div>
      <div className="detail-section" onClick={onEditDuration}>
        <span className="detail-icon"><svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="15" height="7" rx="1" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="0.5" x2="4" y2="4" stroke="currentColor" strokeWidth="1"/><line x1="8" y1="0.5" x2="8" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="12" y1="0.5" x2="12" y2="4" stroke="currentColor" strokeWidth="1"/></svg></span>
        <span className="detail-label">
          {formatDuration(t.duration)}
        </span>
        <span className="hotkey-badge">⌥</span><span className="hotkey-badge">D</span>
      </div>
      <div className="detail-section disabled" aria-disabled="true">
        <span className="detail-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 4v4h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        <span className="detail-label">Snooze</span>
        <span className="hotkey-badge">S</span>
      </div>
      <div className="detail-section disabled" aria-disabled="true">
        <span className="detail-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 014-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 01-4 4H3"/></svg></span>
        <span className="detail-label">Repeat</span>
        <span className="hotkey-badge">R</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section disabled" aria-disabled="true">
        <span className="detail-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.172 2a2 2 0 011.414.586l6.71 6.71a2.4 2.4 0 010 3.408l-4.592 4.592a2.4 2.4 0 01-3.408 0l-6.71-6.71A2 2 0 016 9.172V3a1 1 0 011-1z"/><path d="M2 7v6.172a2 2 0 00.586 1.414l6.71 6.71a2.4 2.4 0 003.191.193"/><circle cx="10.5" cy="6.5" r=".5" fill="currentColor"/></svg></span>
        <span className="detail-label">Labels</span>
        <span className="hotkey-badge">⌘</span><span className="hotkey-badge">L</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section detail-notes-section" onClick={onStartNotesEdit}>
        <div className="detail-notes-header">
          <span className="detail-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l4 4V14a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M10 1.5v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1"/><line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1"/></svg></span>
          <span className="detail-label">Notes</span>
          <span className="hotkey-badge">N</span>
        </div>
        {t.notes && <div className="notes-rendered" dangerouslySetInnerHTML={{ __html: renderedNotes }} />}
      </div>
      <div className="detail-created">{formatCreatedDate(t.created_timestamp)}</div>
    </div>
  );
}
