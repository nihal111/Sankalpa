import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { getSuggestions, type DueDateSuggestion } from './utils/parseNaturalDate';

interface DueDateModalProps {
  isOpen: boolean;
  currentDueDate: number | null;
  onCommit: (timestamp: number | null) => void;
  onClose: () => void;
}

function formatCurrentDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function DueDateModal({ isOpen, currentDueDate, onCommit, onClose }: DueDateModalProps): ReactNode {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const suggestions = useMemo((): DueDateSuggestion[] => getSuggestions(query), [query]);

  useEffect(() => { setSelectedIndex(0); }, [suggestions.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) onCommit(suggestions[selectedIndex].timestamp);
      else if (!query.trim()) onCommit(null); // clear due date
    }
    else if (e.key === 'Backspace' && !query) { e.preventDefault(); onCommit(null); }
  }, [suggestions, selectedIndex, onClose, onCommit, query]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="due-date-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="due-date-modal-input"
          placeholder='e.g. "tomorrow", "3d", "next fri", "2h"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {currentDueDate && !query.trim() && (
          <div className="due-date-current">
            Current: {formatCurrentDate(currentDueDate)}
            <span className="due-date-current-hint">Backspace to clear</span>
          </div>
        )}
        <div className="due-date-suggestions">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`due-date-suggestion-item${i === selectedIndex ? ' selected' : ''}`}
              onClick={() => onCommit(s.timestamp)}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
