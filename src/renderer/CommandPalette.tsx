import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import uFuzzy from '@leeoniya/ufuzzy';
import { actions, type Action, type ActionContext } from './actionRegistry';

interface CommandPaletteProps {
  isOpen: boolean;
  context: ActionContext;
  onClose: () => void;
  onExecute: (actionId: string) => void;
}

const uf = new uFuzzy();

export function CommandPalette({ isOpen, context, onClose, onExecute }: CommandPaletteProps): ReactNode {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  const availableActions = useMemo(
    () => actions.filter((a) => a.isAvailable(context)),
    [context]
  );

  const haystack = useMemo(() => availableActions.map((a) => a.name), [availableActions]);

  const filteredActions = useMemo((): Action[] => {
    if (!query.trim()) return availableActions;
    const [idxs, info, order] = uf.search(haystack, query);
    if (!idxs || !info || !order) return [];
    return order.map((oi) => availableActions[info.idx[oi]]);
  }, [query, haystack, availableActions]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions.length]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredActions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredActions.length > 0) {
      e.preventDefault();
      onExecute(filteredActions[selectedIndex].id);
      onClose();
    }
  }, [filteredActions, selectedIndex, onClose, onExecute]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="palette-input"
          placeholder="Type a command..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div className="palette-results">
          {query.trim() && filteredActions.length === 0 && (
            <div className="palette-no-results">No commands found</div>
          )}
          {filteredActions.map((action, i) => (
            <div
              key={action.id}
              ref={i === selectedIndex ? selectedRef : undefined}
              className={`palette-item${i === selectedIndex ? ' selected' : ''}`}
              onClick={() => { onExecute(action.id); onClose(); }}
            >
              <span className="palette-item-name">{action.name}</span>
              <span className="palette-item-hotkey">
                {action.hotkeyDisplay && action.hotkeyDisplay.split(' ').map((key, j) => (
                  <span key={j} className="hotkey-badge">{key}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
