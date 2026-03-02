import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { List } from '../shared/types';
import { getSuggestions, type DueDateSuggestion } from './utils/parseNaturalDate';

interface QuickAddModalProps {
  isOpen: boolean;
  lists: List[];
  onSubmit: (data: { title: string; listId: string | null; dueDate: number | null; duration: number | null; notes: string }) => void;
  onClose: () => void;
}

type Dropdown = 'list' | 'due' | 'duration' | null;

const DURATION_PRESETS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDueDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function QuickAddModal({ isOpen, lists, onSubmit, onClose }: QuickAddModalProps): ReactNode {
  const [title, setTitle] = useState('');
  const [listId, setListId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [dropdown, setDropdown] = useState<Dropdown>(null);
  const [dropdownQuery, setDropdownQuery] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const dropdownInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setListId(null);
      setDueDate(null);
      setDuration(null);
      setNotes('');
      setDropdown(null);
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (dropdown) {
      setDropdownQuery('');
      setDropdownIndex(0);
      setTimeout(() => dropdownInputRef.current?.focus(), 0);
    }
  }, [dropdown]);

  const listName = useMemo(() => {
    if (!listId) return 'Inbox';
    return lists.find((l) => l.id === listId)?.name ?? 'Inbox';
  }, [listId, lists]);

  const filteredLists = useMemo(() => {
    const q = dropdownQuery.toLowerCase();
    const all = [{ id: null, name: 'Inbox' }, ...lists.map((l) => ({ id: l.id, name: l.name }))];
    return q ? all.filter((l) => l.name.toLowerCase().includes(q)) : all;
  }, [lists, dropdownQuery]);

  const dueSuggestions = useMemo((): DueDateSuggestion[] => getSuggestions(dropdownQuery), [dropdownQuery]);

  const durationSuggestions = useMemo(() => {
    if (!dropdownQuery.trim()) return DURATION_PRESETS;
    const match = dropdownQuery.match(/^(\d+)\s*(m|h)?/i);
    if (!match) return [];
    const val = parseInt(match[1], 10);
    const unit = (match[2] || 'm').toLowerCase();
    const mins = unit === 'h' ? val * 60 : val;
    return [{ label: formatDuration(mins), minutes: mins }];
  }, [dropdownQuery]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), listId, dueDate, duration, notes });
  }, [title, listId, dueDate, duration, notes, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (dropdown) setDropdown(null);
      else onClose();
    } else if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [dropdown, onClose, handleSubmit]);

  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = dropdown === 'list' ? filteredLists : dropdown === 'due' ? dueSuggestions : durationSuggestions;
    if (e.key === 'Escape') { e.preventDefault(); setDropdown(null); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setDropdownIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setDropdownIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (dropdown === 'list' && filteredLists[dropdownIndex]) {
        setListId(filteredLists[dropdownIndex].id);
      } else if (dropdown === 'due' && dueSuggestions[dropdownIndex]) {
        setDueDate(dueSuggestions[dropdownIndex].timestamp);
      } else if (dropdown === 'duration' && durationSuggestions[dropdownIndex]) {
        setDuration(durationSuggestions[dropdownIndex].minutes);
      }
      setDropdown(null);
    }
  }, [dropdown, filteredLists, dueSuggestions, durationSuggestions, dropdownIndex]);

  useEffect(() => { setDropdownIndex(0); }, [dropdownQuery]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input
          ref={titleRef}
          type="text"
          className="quick-add-title"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="quick-add-buttons">
          <button className={`quick-add-btn${listId === null ? '' : ' active'}`} onClick={() => setDropdown(dropdown === 'list' ? null : 'list')}>
            <span className="quick-add-btn-icon">☰</span> {listName}
          </button>
          <button className={`quick-add-btn${dueDate ? ' active' : ''}`} onClick={() => setDropdown(dropdown === 'due' ? null : 'due')}>
            <span className="quick-add-btn-icon">◇</span> {dueDate ? formatDueDate(dueDate) : 'Due date'}
          </button>
          <button className="quick-add-btn disabled" disabled>
            <span className="quick-add-btn-icon">↻</span> Repeat
          </button>
          <button className="quick-add-btn disabled" disabled>
            <span className="quick-add-btn-icon">◆</span> Labels
          </button>
          <button className={`quick-add-btn${duration ? ' active' : ''}`} onClick={() => setDropdown(dropdown === 'duration' ? null : 'duration')}>
            <span className="quick-add-btn-icon">▦</span> {duration ? formatDuration(duration) : 'Duration'}
          </button>
        </div>

        {dropdown && (
          <div className="quick-add-dropdown">
            <input
              ref={dropdownInputRef}
              type="text"
              className="quick-add-dropdown-input"
              placeholder={dropdown === 'list' ? 'Search lists...' : dropdown === 'due' ? 'Set due date' : 'Set duration'}
              value={dropdownQuery}
              onChange={(e) => setDropdownQuery(e.target.value)}
              onKeyDown={handleDropdownKeyDown}
            />
            <div className="quick-add-dropdown-items">
              {dropdown === 'list' && filteredLists.map((l, i) => (
                <div key={l.id ?? 'inbox'} className={`quick-add-dropdown-item${i === dropdownIndex ? ' selected' : ''}`}
                  onClick={() => { setListId(l.id); setDropdown(null); }}>
                  {l.name}
                </div>
              ))}
              {dropdown === 'due' && dueSuggestions.map((s, i) => (
                <div key={i} className={`quick-add-dropdown-item${i === dropdownIndex ? ' selected' : ''}`}
                  onClick={() => { setDueDate(s.timestamp); setDropdown(null); }}>
                  <span>{s.label}</span>
                  <span className="quick-add-dropdown-hint">{new Date(s.timestamp).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              ))}
              {dropdown === 'duration' && durationSuggestions.map((s, i) => (
                <div key={i} className={`quick-add-dropdown-item${i === dropdownIndex ? ' selected' : ''}`}
                  onClick={() => { setDuration(s.minutes); setDropdown(null); }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="quick-add-notes-label">Notes</div>
        <textarea
          className="quick-add-notes"
          placeholder="Add notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="quick-add-footer">
          <button className="quick-add-footer-btn" onClick={onClose}>
            <span className="hotkey-badge">Esc</span> Cancel
          </button>
          <button className="quick-add-footer-btn primary" onClick={handleSubmit}>
            <span className="hotkey-badge">⌘</span><span className="hotkey-badge">↵</span> Create task
          </button>
        </div>
      </div>
    </div>
  );
}
