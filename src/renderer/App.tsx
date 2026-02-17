import { useEffect, useState, useCallback, useRef } from 'react';
import type { List, Task } from '../shared/types';

type Pane = 'lists' | 'tasks';
type EditMode = { type: 'list'; index: number } | { type: 'task'; index: number } | null;
type Theme = 'system' | 'light' | 'dark';

const THEME_COLORS = {
  dark: {
    bgPrimary: '#2a2a28',
    bgSecondary: '#232321',
    bgSelected: '#98801f',
    textPrimary: '#e8e6df',
    border: '#3a3a38',
  },
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#e0e0e0',
    bgSelected: '#f5eaa3',
    textPrimary: '#0d0d0d',
    border: '#d0d0d0',
  },
};

function ThemePreview({ themeKey }: { themeKey: 'light' | 'dark' }): JSX.Element {
  const c = THEME_COLORS[themeKey];
  return (
    <div className="theme-preview" style={{ background: c.bgPrimary, border: `1px solid ${c.border}` }}>
      <div className="theme-preview-sidebar" style={{ background: c.bgSecondary, borderRight: `1px solid ${c.border}` }}>
        <div className="theme-preview-item" style={{ background: c.bgSelected }} />
        <div className="theme-preview-item" style={{ background: c.bgSecondary }} />
      </div>
      <div className="theme-preview-main">
        <div className="theme-preview-item" style={{ background: c.bgSelected }} />
        <div className="theme-preview-item" style={{ background: c.bgPrimary }} />
      </div>
    </div>
  );
}

function SystemThemePreview(): JSX.Element {
  const dark = THEME_COLORS.dark;
  const light = THEME_COLORS.light;
  return (
    <div className="theme-preview" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: dark.bgPrimary, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: light.bgPrimary, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      <div className="theme-preview-sidebar" style={{ background: 'transparent', position: 'relative', zIndex: 1 }}>
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgSelected} 50%, ${light.bgSelected} 50%)` }} />
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgSecondary} 50%, ${light.bgSecondary} 50%)` }} />
      </div>
      <div className="theme-preview-main" style={{ background: 'transparent', position: 'relative', zIndex: 1 }}>
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgSelected} 50%, ${light.bgSelected} 50%)` }} />
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgPrimary} 50%, ${light.bgPrimary} 50%)` }} />
      </div>
    </div>
  );
}

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

  // Multi-select state
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [boundaryCursor, setBoundaryCursor] = useState<number | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [cmdHeld, setCmdHeld] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [settingsThemeIndex, setSettingsThemeIndex] = useState(0);
  const themes: Theme[] = ['light', 'dark', 'system'];

  const inputRef = useRef<HTMLInputElement>(null);
  const selectedList = lists[selectedListIndex];

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    if (focusedPane === 'tasks' && (tasks[selectedTaskIndex] || selectedTaskIndices.size > 0)) {
      setMoveMode(true);
      setMoveTargetIndex(selectedListIndex);
    }
  }, [focusedPane, tasks, selectedTaskIndex, selectedListIndex, selectedTaskIndices.size]);

  const commitMove = useCallback(async () => {
    const targetList = lists[moveTargetIndex];
    if (!targetList || targetList.id === selectedList?.id) {
      setMoveMode(false);
      return;
    }

    // Get indices to move: either multi-selection or single selected task
    const indicesToMove = selectedTaskIndices.size > 0
      ? Array.from(selectedTaskIndices).sort((a, b) => a - b)
      : [selectedTaskIndex];

    // Move tasks in order to preserve relative ordering
    for (const idx of indicesToMove) {
      const task = tasks[idx];
      if (task) {
        await window.api.tasksMove(task.id, targetList.id);
      }
    }

    // Clear selection and switch focus to destination list
    setSelectedTaskIndices(new Set());
    setSelectionAnchor(null);
    setBoundaryCursor(null);
    setSelectedListIndex(moveTargetIndex);
    setFocusedPane('lists');
    setMoveMode(false);
  }, [tasks, selectedTaskIndex, lists, moveTargetIndex, selectedList, selectedTaskIndices]);

  const clearSelection = useCallback(() => {
    setSelectedTaskIndices(new Set());
    setSelectionAnchor(null);
    setBoundaryCursor(null);
  }, []);

  const handleArrowNavigation = useCallback((e: KeyboardEvent) => {
    const delta = e.key === 'ArrowUp' ? -1 : 1;

    // Reorder: Cmd+Shift+Arrow (works in both panes, clears any selection)
    if (e.metaKey && e.shiftKey) {
      if (selectedTaskIndices.size > 0) clearSelection();
      handleReorder(delta);
      return;
    }

    if (focusedPane === 'lists') {
      setSelectedListIndex((i) => Math.max(0, Math.min(lists.length - 1, i + delta)));
      return;
    }

    // Tasks pane with Cmd held: move boundary cursor only
    if (cmdHeld) {
      setBoundaryCursor((i) => Math.max(0, Math.min(tasks.length - 1, (i ?? selectedTaskIndex) + delta)));
      return;
    }

    // Tasks pane with Shift held: extend/contract selection
    if (shiftHeld && selectionAnchor !== null) {
      const newIndex = Math.max(0, Math.min(tasks.length - 1, selectedTaskIndex + delta));
      setSelectedTaskIndex(newIndex);
      // Build selection from anchor to new index
      const minIdx = Math.min(selectionAnchor, newIndex);
      const maxIdx = Math.max(selectionAnchor, newIndex);
      const newSelection = new Set<number>();
      for (let i = minIdx; i <= maxIdx; i++) {
        newSelection.add(i);
      }
      setSelectedTaskIndices(newSelection);
      return;
    }

    // Normal navigation: clear any selection
    if (selectedTaskIndices.size > 0) clearSelection();
    setSelectedTaskIndex((i) => Math.max(0, Math.min(tasks.length - 1, i + delta)));
  }, [focusedPane, lists.length, tasks.length, selectedTaskIndex, selectionAnchor, shiftHeld, cmdHeld, selectedTaskIndices.size, handleReorder, clearSelection]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd+, opens settings
    if (e.metaKey && e.key === ',') {
      e.preventDefault();
      setSettingsOpen(true);
      setSettingsThemeIndex(themes.indexOf(theme));
      return;
    }

    // Handle settings modal
    if (settingsOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSettingsOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSettingsThemeIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSettingsThemeIndex((i) => Math.min(themes.length - 1, i + 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        setTheme(themes[settingsThemeIndex]);
        setSettingsOpen(false);
        return;
      }
      return;
    }

    // Track modifier keys
    if (e.key === 'Shift' && focusedPane === 'tasks' && !editMode && !moveMode) {
      if (!shiftHeld) {
        setShiftHeld(true);
        if (selectionAnchor === null) {
          setSelectionAnchor(selectedTaskIndex);
        }
      }
      return;
    }

    if (e.key === 'Meta' && focusedPane === 'tasks' && !editMode && !moveMode) {
      if (!cmdHeld) {
        setCmdHeld(true);
        setBoundaryCursor(selectedTaskIndex);
        // Auto-add first item to selection
        setSelectedTaskIndices((prev) => new Set(prev).add(selectedTaskIndex));
      }
      return;
    }

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

    // Esc: clear selection
    if (e.key === 'Escape' && selectedTaskIndices.size > 0) {
      e.preventDefault();
      clearSelection();
      return;
    }

    // Cmd+Enter: toggle selection at current position
    if (cmdHeld && e.key === 'Enter') {
      e.preventDefault();
      const targetIdx = boundaryCursor ?? selectedTaskIndex;
      setSelectedTaskIndices((prev) => {
        const next = new Set(prev);
        if (next.has(targetIdx)) {
          next.delete(targetIdx);
        } else {
          next.add(targetIdx);
        }
        return next;
      });
      return;
    }

    // Space without Cmd: clear selection and focus item
    if (e.key === ' ' && !cmdHeld && focusedPane === 'tasks') {
      e.preventDefault();
      clearSelection();
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
      // Clear selection when switching panes
      if (selectedTaskIndices.size > 0) clearSelection();
      setFocusedPane((p) => (p === 'lists' ? 'tasks' : 'lists'));
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleArrowNavigation(e);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // Don't enter edit mode if multi-selection exists
      if (selectedTaskIndices.size > 0) return;
      startEdit();
      return;
    }

    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      startMove();
      return;
    }
  }, [editMode, moveMode, focusedPane, lists.length, selectedTaskIndices.size, handleArrowNavigation, startEdit, startMove, commitMove, createList, createTask, shiftHeld, cmdHeld, selectedTaskIndex, boundaryCursor, clearSelection, settingsOpen, settingsThemeIndex, theme, themes]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      setShiftHeld(false);
      return;
    }

    if (e.key === 'Meta') {
      setCmdHeld(false);
      // Move cursor to where boundaryCursor was
      if (boundaryCursor !== null) {
        setSelectedTaskIndex(boundaryCursor);
      }
      setBoundaryCursor(null);
      return;
    }
  }, [boundaryCursor]);

  // Clear selection when releasing Shift/Cmd with only one item
  useEffect(() => {
    if (!shiftHeld && !cmdHeld && selectedTaskIndices.size === 1) {
      setSelectedTaskIndices(new Set());
      setSelectionAnchor(null);
    }
  }, [shiftHeld, cmdHeld, selectedTaskIndices.size]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

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
              className={`item ${i === selectedTaskIndex && !cmdHeld ? 'selected' : ''} ${selectedTaskIndices.has(i) ? 'multi-selected' : ''} ${shiftHeld && i === selectedTaskIndex ? 'cursor' : ''} ${cmdHeld && i === boundaryCursor ? 'cursor' : ''}`}
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
      {settingsOpen && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="settings-header">Settings</div>
            <div className="settings-body">
              <div className="settings-categories">
                <div className="settings-category selected">Theme</div>
              </div>
              <div className="settings-content">
                <div className="theme-options">
                  <div className={`theme-card ${settingsThemeIndex === 0 ? 'selected' : ''}`}>
                    <ThemePreview themeKey="light" />
                    <div className="theme-label">Light</div>
                  </div>
                  <div className={`theme-card ${settingsThemeIndex === 1 ? 'selected' : ''}`}>
                    <ThemePreview themeKey="dark" />
                    <div className="theme-label">Dark</div>
                  </div>
                  <div className={`theme-card ${settingsThemeIndex === 2 ? 'selected' : ''}`}>
                    <SystemThemePreview />
                    <div className="theme-label">System</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="settings-footer">←→ select theme · Enter apply · Esc close</div>
          </div>
        </div>
      )}
    </div>
  );
}
