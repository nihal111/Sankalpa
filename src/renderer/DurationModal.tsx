import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';

interface DurationModalProps {
  isOpen: boolean;
  currentDuration: number | null;
  onCommit: (minutes: number | null) => void;
  onClose: () => void;
}

interface DurationSuggestion {
  label: string;
  minutes: number;
}

function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const match = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?|w|wk|wks|weeks?)?$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2] || 'm';
  if (unit.startsWith('w')) return Math.round(val * 7 * 24 * 60);
  if (unit.startsWith('d')) return Math.round(val * 24 * 60);
  if (unit.startsWith('h')) return Math.round(val * 60);
  return Math.round(val);
}

function getSuggestions(query: string): DurationSuggestion[] {
  const defaults: DurationSuggestion[] = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
  ];
  if (!query.trim()) return defaults;
  const parsed = parseDuration(query);
  if (parsed === null) return [];
  return [{ label: formatDuration(parsed), minutes: parsed }];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
  }
  if (minutes < 7 * 24 * 60) {
    const d = Math.floor(minutes / (24 * 60));
    return `${d} day${d > 1 ? 's' : ''}`;
  }
  const w = Math.floor(minutes / (7 * 24 * 60));
  return `${w} week${w > 1 ? 's' : ''}`;
}

export function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (minutes < 7 * 24 * 60) {
    const d = Math.floor(minutes / (24 * 60));
    return `${d}d`;
  }
  const w = Math.floor(minutes / (7 * 24 * 60));
  return `${w}w`;
}

export function DurationModal({ isOpen, currentDuration, onCommit, onClose }: DurationModalProps): ReactNode {
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

  const suggestions = useMemo(() => getSuggestions(query), [query]);

  useEffect(() => { setSelectedIndex(0); }, [suggestions.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) onCommit(suggestions[selectedIndex].minutes);
      else if (!query.trim()) onCommit(null);
    }
    else if (e.key === 'Backspace' && !query) { e.preventDefault(); onCommit(null); }
  }, [suggestions, selectedIndex, onClose, onCommit, query]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="duration-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="duration-modal-input"
          placeholder='e.g. "15m", "1h", "3d", "1w"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {currentDuration && !query.trim() && (
          <div className="duration-current">
            Current: {formatDuration(currentDuration)}
            <span className="duration-current-hint">Backspace to clear</span>
          </div>
        )}
        <div className="duration-suggestions">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`duration-suggestion-item${i === selectedIndex ? ' selected' : ''}`}
              onClick={() => onCommit(s.minutes)}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
