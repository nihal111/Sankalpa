import { useEffect, useState, useCallback, useRef } from 'react';
import type { List, Task } from '../shared/types';

type Pane = 'lists' | 'tasks';
type EditMode = { type: 'list'; index: number } | { type: 'task'; index: number } | null;

export default function App(): JSX.Element {
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusedPane, setFocusedPane] = useState<Pane>('lists');
  const [selectedListIndex, setSelectedListIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState('');
  const [moveMode, setMoveMode] = useState(false);
  const [moveTargetIndex, setMoveTargetIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
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

  // Focus input when editing
  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editMode]);

  const reloadLists = useCallback(async () => {
    const newLists = await window.api.listsGetAll();
    setLists(newLists);
  }, []);

  const reloadTasks = useCallback(async () => {
    if (selectedList) {
      const newTasks = await window.api.tasksGetByList(selectedList.id);
      setTasks(newTasks);
    }
  }, [selectedList]);

  const handleReorder = useCallback(async (direction: -1 | 1) => {
    if (focusedPane === 'lists') {
      const newIndex = selectedListIndex + direction;
      if (newIndex < 0 || newIndex >= lists.length) return;
      const item = lists[selectedListIndex];
      const neighbor = lists[newIndex];
      // Swap sort_keys
      await window.api.listsReorder(item.id, neighbor.sort_key);
      await window.api.listsReorder(neighbor.id, item.sort_key);
      await reloadLists();
      setSelectedListIndex(newIndex);
    } else {
      const newIndex = selectedTaskIndex + direction;
      if (newIndex < 0 || newIndex >= tasks.length) return;
      const item = tasks[selectedTaskIndex];
      const neighbor = tasks[newIndex];
      await window.api.tasksReorder(item.id, neighbor.sort_key);
      await window.api.tasksReorder(neighbor.id, item.sort_key);
      await reloadTasks();
      setSelectedTaskIndex(newIndex);
    }
  }, [focusedPane, selectedListIndex, selectedTaskIndex, lists, tasks, reloadLists, reloadTasks]);

  const startEdit = useCallback(() => {
    if (focusedPane === 'lists' && lists[selectedListIndex]) {
      setEditMode({ type: 'list', index: selectedListIndex });
      setEditValue(lists[selectedListIndex].name);
    } else if (focusedPane === 'tasks' && tasks[selectedTaskIndex]) {
      setEditMode({ type: 'task', index: selectedTaskIndex });
      setEditValue(tasks[selectedTaskIndex].title);
    }
  }, [focusedPane, selectedListIndex, selectedTaskIndex, lists, tasks]);

  const commitEdit = useCallback(async () => {
    if (!editMode || !editValue.trim()) {
      setEditMode(null);
      return;
    }
    if (editMode.type === 'list') {
      await window.api.listsUpdate(lists[editMode.index].id, editValue.trim());
      await reloadLists();
    } else {
      await window.api.tasksUpdate(tasks[editMode.index].id, editValue.trim());
      await reloadTasks();
    }
    setEditMode(null);
  }, [editMode, editValue, lists, tasks, reloadLists, reloadTasks]);

  const createList = useCallback(async () => {
    const id = crypto.randomUUID();
    const newList = await window.api.listsCreate(id, '');
    await reloadLists();
    const newLists = await window.api.listsGetAll();
    const newIndex = newLists.findIndex((l) => l.id === newList.id);
    setSelectedListIndex(newIndex);
    setFocusedPane('lists');
    setEditMode({ type: 'list', index: newIndex });
    setEditValue('');
  }, [reloadLists]);

  const createTask = useCallback(async () => {
    if (!selectedList) return;
    const id = crypto.randomUUID();
    const newTask = await window.api.tasksCreate(id, selectedList.id, '');
    await reloadTasks();
    const newTasks = await window.api.tasksGetByList(selectedList.id);
    const newIndex = newTasks.findIndex((t) => t.id === newTask.id);
    setSelectedTaskIndex(newIndex);
    setFocusedPane('tasks');
    setEditMode({ type: 'task', index: newIndex });
    setEditValue('');
  }, [selectedList, reloadTasks]);

  const startMove = useCallback(() => {
    if (focusedPane === 'tasks' && tasks[selectedTaskIndex]) {
      setMoveMode(true);
      setMoveTargetIndex(selectedListIndex);
    }
  }, [focusedPane, tasks, selectedTaskIndex, selectedListIndex]);

  const commitMove = useCallback(async () => {
    const task = tasks[selectedTaskIndex];
    const targetList = lists[moveTargetIndex];
    if (task && targetList && targetList.id !== selectedList?.id) {
      await window.api.tasksMove(task.id, targetList.id);
      await reloadTasks();
    }
    setMoveMode(false);
  }, [tasks, selectedTaskIndex, lists, moveTargetIndex, selectedList, reloadTasks]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle edit mode input
    if (editMode) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditMode(null);
      }
      return; // Let input handle other keys
    }

    // Handle move mode
    if (moveMode) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMoveMode(false);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const delta = e.key === 'ArrowUp' ? -1 : 1;
        setMoveTargetIndex((i) => Math.max(0, Math.min(lists.length - 1, i + delta)));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commitMove();
        return;
      }
      return;
    }

    // Reorder: Cmd+Shift+Up/Down
    if (e.metaKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      handleReorder(e.key === 'ArrowUp' ? -1 : 1);
      return;
    }

    // Create: Cmd+N (task), Cmd+Shift+N (list)
    if (e.metaKey && e.key === 'n') {
      e.preventDefault();
      if (e.shiftKey) {
        createList();
      } else {
        createTask();
      }
      return;
    }

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
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      startEdit();
      return;
    }

    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      startMove();
      return;
    }
  }, [editMode, moveMode, focusedPane, lists.length, tasks.length, handleReorder, startEdit, startMove, commitMove, createList, createTask]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
  };

  return (
    <div className="app">
      <div className={`pane lists-pane ${focusedPane === 'lists' ? 'focused' : ''}`}>
        <h2>Lists</h2>
        <ul className="item-list">
          {lists.map((list, i) => (
            <li
              key={list.id}
              className={`item ${i === selectedListIndex ? 'selected' : ''} ${moveMode && i === moveTargetIndex ? 'move-target' : ''}`}
            >
              {editMode?.type === 'list' && editMode.index === i ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={() => setEditMode(null)}
                  className="edit-input"
                />
              ) : (
                list.name
              )}
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
              {editMode?.type === 'task' && editMode.index === i ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={() => setEditMode(null)}
                  className="edit-input"
                />
              ) : (
                task.title
              )}
            </li>
          ))}
        </ul>
      </div>
      {moveMode && (
        <div className="move-overlay">
          <div className="move-hint">Move to: {lists[moveTargetIndex]?.name} (↑↓ to select, Enter to confirm, Esc to cancel)</div>
        </div>
      )}
    </div>
  );
}
