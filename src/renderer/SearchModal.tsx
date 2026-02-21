import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import uFuzzy from '@leeoniya/ufuzzy';
import type { Task, List } from '../shared/types';

interface SearchResult {
  task: Task;
  listName: string;
}

interface SearchModalProps {
  isOpen: boolean;
  lastQuery: string;
  onClose: () => void;
  onSelectTask: (taskId: string, listId: string | null) => void;
  onQueryChange: (query: string) => void;
}

const uf = new uFuzzy();

export function SearchModal({ isOpen, lastQuery, onClose, onSelectTask, onQueryChange }: SearchModalProps): ReactNode {
  const [query, setQuery] = useState(lastQuery);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(lastQuery);
      setSelectedIndex(0);
      Promise.all([window.api.tasksGetAll(), window.api.listsGetAll()]).then(([t, l]) => {
        setTasks(t);
        setLists(l);
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, lastQuery]);

  const listNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of lists) map[l.id] = l.name;
    return map;
  }, [lists]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const haystack = tasks.map((t) => t.title);
    const [idxs] = uf.search(haystack, query);
    if (!idxs) return [];
    return idxs.map((i) => ({
      task: tasks[i],
      listName: tasks[i].list_id ? (listNames[tasks[i].list_id!] || 'Unknown') : 'Inbox',
    }));
  }, [query, tasks, listNames]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      const result = results[selectedIndex];
      onQueryChange(query);
      onSelectTask(result.task.id, result.task.list_id);
    }
  }, [results, selectedIndex, onClose, onSelectTask, onQueryChange, query]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search tasks..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div className="search-results">
          {query.trim() && results.length === 0 && (
            <div className="search-no-results">No tasks found</div>
          )}
          {results.map((r, i) => (
            <div
              key={r.task.id}
              className={`search-result-item${i === selectedIndex ? ' selected' : ''}`}
            >
              <span className="search-result-title">{r.task.title || 'Untitled'}</span>
              <span className="search-result-list">{r.listName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
