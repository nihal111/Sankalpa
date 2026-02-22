import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Task } from '../shared/types';
import type { Pane } from './types';
import { marked } from 'marked';

function formatDueDate(ms: number | null): string {
  if (!ms) return 'Set due date';
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
  notesEditing: boolean;
  onStartNotesEdit: () => void;
  onNotesCommit: (value: string) => void;
  onNotesCancelEdit: () => void;
}

export function TaskDetailPane({
  task,
  focusedPane,
  onEditTitle,
  onEditDueDate,
  notesEditing,
  onStartNotesEdit,
  onNotesCommit,
  onNotesCancelEdit,
}: TaskDetailPaneProps): ReactNode {
  const [notesValue, setNotesValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (notesEditing) {
      setNotesValue(task?.notes ?? '');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [notesEditing, task?.notes]);

  const handleNotesBlur = useCallback(() => {
    onNotesCommit(notesValue);
  }, [notesValue, onNotesCommit]);

  const handleNotesKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onNotesCancelEdit(); }
  }, [onNotesCancelEdit]);

  const renderedNotes = useMemo(() => {
    if (!task?.notes) return '';
    return marked.parse(task.notes, { async: false }) as string;
  }, [task?.notes]);

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
          {formatDueDate(task.due_date)}
        </span>
        <span className="hotkey-badge">D</span>
      </div>
      <div className="detail-section disabled" aria-disabled="true">
        <span className="detail-icon">🕐</span>
        <span className="detail-label">Snooze</span>
        <span className="hotkey-badge">S</span>
      </div>
      <div className="detail-section disabled" aria-disabled="true">
        <span className="detail-icon">🔁</span>
        <span className="detail-label">Repeat</span>
        <span className="hotkey-badge">R</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section disabled" aria-disabled="true">
        <span className="detail-icon">🏷️</span>
        <span className="detail-label">Labels</span>
        <span className="hotkey-badge">⌘</span><span className="hotkey-badge">L</span>
      </div>
      <div className="detail-separator" />
      <div className="detail-section detail-notes-section" onClick={!notesEditing ? onStartNotesEdit : undefined}>
        <div className="detail-notes-header">
          <span className="detail-icon">📄</span>
          <span className="detail-label">Notes</span>
          <span className="hotkey-badge">N</span>
        </div>
        {notesEditing ? (
          <textarea
            ref={textareaRef}
            className="notes-textarea"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleNotesBlur}
            onKeyDown={handleNotesKeyDown}
            placeholder="Write notes in markdown..."
          />
        ) : task.notes ? (
          <div className="notes-rendered" dangerouslySetInnerHTML={{ __html: renderedNotes }} />
        ) : null}
      </div>
      <div className="detail-created">{formatCreatedDate(task.created_timestamp)}</div>
    </div>
  );
}
