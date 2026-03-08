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

const BellIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.268 21a2 2 0 003.464 0"/><path d="M3.262 15.326A1 1 0 004 17h16a1 1 0 00.74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 006 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>;
const RepeatIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 014-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 01-4 4H3"/></svg>;
const TagIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.172 2a2 2 0 011.414.586l6.71 6.71a2.4 2.4 0 010 3.408l-4.592 4.592a2.4 2.4 0 01-3.408 0l-6.71-6.71A2 2 0 016 9.172V3a1 1 0 011-1z"/><path d="M2 7v6.172a2 2 0 00.586 1.414l6.71 6.71a2.4 2.4 0 003.191.193"/><circle cx="10.5" cy="6.5" r=".5" fill="currentColor"/></svg>;
const RulerIcon = <svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="15" height="7" rx="1" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="0.5" x2="4" y2="4" stroke="currentColor" strokeWidth="1"/><line x1="8" y1="0.5" x2="8" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="12" y1="0.5" x2="12" y2="4" stroke="currentColor" strokeWidth="1"/></svg>;

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

  const selectAndAdvance = useCallback((type: Dropdown) => {
    if (type === 'list' && filteredLists[dropdownIndex]) {
      setListId(filteredLists[dropdownIndex].id);
      setDropdown('due');
    } else if (type === 'due' && dueSuggestions[dropdownIndex]) {
      setDueDate(dueSuggestions[dropdownIndex].timestamp);
      setDropdown('duration');
    } else if (type === 'due') {
      setDropdown('duration');
    } else if (type === 'duration' && durationSuggestions[dropdownIndex]) {
      setDuration(durationSuggestions[dropdownIndex].minutes);
      setDropdown(null);
      setTimeout(() => titleRef.current?.focus(), 0);
    } else if (type === 'duration') {
      setDropdown(null);
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [filteredLists, dueSuggestions, durationSuggestions, dropdownIndex]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      setDropdown('list');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

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

  const selectAndGoBack = useCallback((type: Dropdown) => {
    if (type === 'list') {
      setDropdown(null);
      setTimeout(() => titleRef.current?.focus(), 0);
    } else if (type === 'due') {
      setDropdown('list');
    } else if (type === 'duration') {
      setDropdown('due');
    }
  }, []);

  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = dropdown === 'list' ? filteredLists : dropdown === 'due' ? dueSuggestions : durationSuggestions;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setDropdown(null);
      titleRef.current?.focus();
    } else if (e.key === 'ArrowDown') { e.preventDefault(); setDropdownIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setDropdownIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      selectAndGoBack(dropdown);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectAndAdvance(dropdown);
    } else if (e.key === 'Backspace' && !dropdownQuery) {
      e.preventDefault();
      if (dropdown === 'due') setDueDate(null);
      else if (dropdown === 'duration') setDuration(null);
      else if (dropdown === 'list') setListId(null);
    }
  }, [dropdown, filteredLists, dueSuggestions, durationSuggestions, selectAndAdvance, dropdownQuery, selectAndGoBack]);

  useEffect(() => { setDropdownIndex(0); }, [dropdownQuery]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input
          ref={titleRef}
          type="text"
          autoFocus={isOpen}
          className={`quick-add-title${dropdown === null ? '' : ' unfocused'}`}
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
        />
        <div className="quick-add-buttons">
          <button className={`quick-add-btn quick-add-btn-list${dropdown === 'list' ? ' focused' : ''}`} onClick={() => setDropdown(dropdown === 'list' ? null : 'list')}>
            <span className="quick-add-btn-icon">☰</span> <span className="quick-add-btn-text">{listName}</span>
          </button>
          <button className={`quick-add-btn${dropdown === 'due' ? ' focused' : ''}`} onClick={() => setDropdown(dropdown === 'due' ? null : 'due')}>
            <span className="quick-add-btn-icon">{BellIcon}</span> {dueDate ? formatDueDate(dueDate) : 'Due date'}
          </button>
          <button className="quick-add-btn disabled" disabled>
            <span className="quick-add-btn-icon">{RepeatIcon}</span> Repeat
          </button>
          <button className="quick-add-btn disabled" disabled>
            <span className="quick-add-btn-icon">{TagIcon}</span> Labels
          </button>
          <button className={`quick-add-btn${dropdown === 'duration' ? ' focused' : ''}`} onClick={() => setDropdown(dropdown === 'duration' ? null : 'duration')}>
            <span className="quick-add-btn-icon">{RulerIcon}</span> {duration ? formatDuration(duration) : 'Duration'}
          </button>
        </div>

        {dropdown && (
          <div className="quick-add-dropdown">
            {((dropdown === 'due' && dueDate) || (dropdown === 'duration' && duration) || (dropdown === 'list' && listId)) && (
              <div className="quick-add-dropdown-current">
                <span>Current: {dropdown === 'due' ? formatDueDate(dueDate!) : dropdown === 'duration' ? formatDuration(duration!) : listName}</span>
                <span className="quick-add-dropdown-hint">⌫ to clear</span>
              </div>
            )}
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
