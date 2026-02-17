import { useEffect, useState, useCallback } from 'react';
import type { List, Task } from '../shared/types';

type Pane = 'lists' | 'tasks';

export default function App(): JSX.Element {
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedListIndex, setSelectedListIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  const selectedList = lists[selectedListIndex];

  // Load lists on mount
  useEffect(() => {
    window.api.listsGetAll().then(setLists);
  }, []);

  // Load tasks when selected list changes
  useEffect(() => {
    if (selectedList) {
      window.api.tasksGetByList(selectedList.id).then((t) => {
        setTasks(t);
        setSelectedTaskIndex(0);
      });
    } else {
      setTasks([]);
    }
  }, [selectedList?.id]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setFocusedPane((p) => (p === 'lists' ? 'tasks' : 'lists'));
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? -1 : 1;
      if (focusedPane === 'lists') {
        setSelectedListIndex((i) => Math.max(0, Math.min(lists.length - 1, i + delta)));
      } else {
        setSelectedTaskIndex((i) => Math.max(0, Math.min(tasks.length - 1, i + delta)));
      }
    }
  }, [focusedPane, lists.length, tasks.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <div className={`pane lists-pane ${focusedPane === 'lists' ? 'focused' : ''}`}>
        <h2>Lists</h2>
        <ul className="item-list">
          {lists.map((list, i) => (
            <li
              key={list.id}
              className={`item ${i === selectedListIndex ? 'selected' : ''}`}
            >
              {list.name}
            </li>
          ))}
        </ul>
      </div>
      <div className={`pane tasks-pane ${focusedPane === 'tasks' ? 'focused' : ''}`}>
        <h2>{selectedList?.name ?? 'Tasks'}</h2>
        <ul className="item-list">
          {tasks.map((task, i) => (
            <li
              key={task.id}
              className={`item ${i === selectedTaskIndex ? 'selected' : ''}`}
            >
              {task.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
