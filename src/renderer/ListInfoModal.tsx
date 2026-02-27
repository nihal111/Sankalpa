import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { SidebarItem } from './types';

interface ListInfoModalProps {
  isOpen: boolean;
  selectedSidebarItem: SidebarItem | undefined;
  onClose: () => void;
  onNotesChange: (listId: string, notes: string | null) => Promise<void>;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ListInfoModal({ isOpen, selectedSidebarItem, onClose, onNotesChange }: ListInfoModalProps): ReactNode {
  const list = selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) setEditing(false);
  }, [isOpen]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const startEdit = useCallback(() => {
    setDraft(list?.notes ?? '');
    setEditing(true);
  }, [list?.notes]);

  const commitEdit = useCallback(async () => {
    if (!list) return;
    const value = draft.trim() || null;
    if (value !== (list.notes ?? null)) await onNotesChange(list.id, value);
    setEditing(false);
  }, [list, draft, onNotesChange]);

  if (!isOpen || !list) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal list-info-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{list.name || 'Untitled'}</h2>
        <div className="list-info-row">
          <span className="list-info-label">Notes</span>
          {editing ? (
            <textarea
              ref={textareaRef}
              className="list-notes-editor"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.stopPropagation(); commitEdit(); }
              }}
              rows={4}
            />
          ) : (
            <span className="list-notes-display" onClick={startEdit}>
              {list.notes || <span className="placeholder">Click to add notes…</span>}
            </span>
          )}
        </div>
        <div className="list-info-row">
          <span className="list-info-label">Created</span>
          <span>{formatDate(list.created_at)}</span>
        </div>
        <div className="list-info-row">
          <span className="list-info-label">Updated</span>
          <span>{formatDate(list.updated_at)}</span>
        </div>
        <div className="confirmation-buttons">
          <button onClick={onClose}>Close <span className="hotkey-badge">Esc</span></button>
        </div>
      </div>
    </div>
  );
}
