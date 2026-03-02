import { useRef, useEffect, type ReactNode } from 'react';

interface LocalSearchBarProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  matchCount: number;
}

export function LocalSearchBar({ isOpen, query, onQueryChange, onClose, matchCount }: LocalSearchBarProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  if (!isOpen) return null;

  return (
    <div className="local-search-bar">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search in current list..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="search-match-count">{matchCount} {matchCount === 1 ? 'match' : 'matches'}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
}
