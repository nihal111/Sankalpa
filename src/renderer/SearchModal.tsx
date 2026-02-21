import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode, type JSX } from 'react';
import uFuzzy from '@leeoniya/ufuzzy';
import type { Task, List } from '../shared/types';

interface SearchResult {
  task: Task;
  listName: string;
  notesSnippet: JSX.Element | null;
}

interface SearchModalProps {
  isOpen: boolean;
  lastQuery: string;
  onClose: () => void;
  onSelectTask: (taskId: string, listId: string | null) => void;
  onQueryChange: (query: string) => void;
}

const uf = new uFuzzy();

const SNIPPET_CONTEXT = 40;

function buildNotesSnippet(notes: string, ranges: number[], titleLen: number): JSX.Element {
  // Collect match intervals within notes, adjusted to notes-local offsets
  const intervals: [number, number][] = [];
  for (let i = 0; i < ranges.length; i += 2) {
    const start = ranges[i];
    const end = ranges[i + 1];
    if (end > titleLen) {
      intervals.push([Math.max(0, start - titleLen), end - titleLen]);
    }
  }
  if (intervals.length === 0) return <span className="search-result-notes" />;

  // Build a snippet window around the first match
  const firstStart = intervals[0][0];
  const lastEnd = intervals[intervals.length - 1][1];
  const snippetStart = Math.max(0, firstStart - SNIPPET_CONTEXT);
  const snippetEnd = Math.min(notes.length, lastEnd + SNIPPET_CONTEXT);
  const snippet = (snippetStart > 0 ? '…' : '') + notes.slice(snippetStart, snippetEnd) + (snippetEnd < notes.length ? '…' : '');

  // Build elements with bold matches
  const parts: JSX.Element[] = [];
  let cursor = 0;
  for (const [s, e] of intervals) {
    const localS = s - snippetStart + (snippetStart > 0 ? 1 : 0); // +1 for ellipsis
    const localE = e - snippetStart + (snippetStart > 0 ? 1 : 0);
    if (localS > cursor) {
      parts.push(<span key={`t${cursor}`}>{snippet.slice(cursor, localS)}</span>);
    }
    parts.push(<b key={`b${localS}`}>{snippet.slice(localS, localE)}</b>);
    cursor = localE;
  }
  if (cursor < snippet.length) {
    parts.push(<span key={`t${cursor}`}>{snippet.slice(cursor)}</span>);
  }

  return <span className="search-result-notes">{parts}</span>;
}

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

  const haystack = useMemo(() => tasks.map((t) => t.notes ? `${t.title} ${t.notes}` : t.title), [tasks]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const [idxs, info, order] = uf.search(haystack, query);
    if (!idxs || !info || !order) return [];
    return order.map((oi) => {
      const idx = info.idx[oi];
      const task = tasks[idx];
      const listName = task.list_id ? (listNames[task.list_id!] || 'Unknown') : 'Inbox';
      let notesSnippet: JSX.Element | null = null;
      if (task.notes && info.ranges[oi]) {
        const titleLen = task.title.length + 1; // +1 for the space separator
        const ranges = info.ranges[oi];
        // Check if any match range falls within the notes portion
        const hasNotesMatch = ranges.some((_, ri) => ri % 2 === 0 && ranges[ri + 1] > titleLen);
        if (hasNotesMatch) {
          notesSnippet = buildNotesSnippet(task.notes, ranges, titleLen);
        }
      }
      return { task, listName, notesSnippet };
    });
  }, [query, haystack, tasks, listNames]);

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
              <div className="search-result-content">
                <span className="search-result-title">{r.task.title || 'Untitled'}</span>
                {r.notesSnippet}
              </div>
              <span className="search-result-list">{r.listName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
