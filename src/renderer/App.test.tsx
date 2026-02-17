import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import type { List, Task } from '../shared/types';

const mockLists: List[] = [
  { id: '1', name: 'Inbox', sort_key: 1, created_at: 0, updated_at: 0 },
  { id: '2', name: 'Work', sort_key: 2, created_at: 0, updated_at: 0 },
];

const mockTasks: Task[] = [
  { id: 't1', list_id: '1', title: 'Task 1', sort_key: 1, created_at: 0, updated_at: 0 },
  { id: 't2', list_id: '1', title: 'Task 2', sort_key: 2, created_at: 0, updated_at: 0 },
];

function setupMockApi(overrides = {}) {
  window.api = {
    listsGetAll: vi.fn().mockResolvedValue(mockLists),
    tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
    listsUpdate: vi.fn().mockResolvedValue(undefined),
    tasksUpdate: vi.fn().mockResolvedValue(undefined),
    listsReorder: vi.fn().mockResolvedValue(undefined),
    tasksReorder: vi.fn().mockResolvedValue(undefined),
    tasksMove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as typeof window.api;
}

beforeEach(() => {
  setupMockApi();
});

describe('App', () => {
  it('renders two panes', async () => {
    render(<App />);
    expect(screen.getByText('Lists')).toBeDefined();
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
  });

  it('loads and displays lists', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeDefined();
    });
  });

  it('loads tasks for selected list', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeDefined();
      expect(screen.getByText('Task 2')).toBeDefined();
    });
  });

  it('switches pane focus with Tab', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    const listsPane = document.querySelector('.lists-pane');
    const tasksPane = document.querySelector('.tasks-pane');

    expect(listsPane?.classList.contains('focused')).toBe(true);
    expect(tasksPane?.classList.contains('focused')).toBe(false);

    fireEvent.keyDown(window, { key: 'Tab' });

    expect(listsPane?.classList.contains('focused')).toBe(false);
    expect(tasksPane?.classList.contains('focused')).toBe(true);

    fireEvent.keyDown(window, { key: 'Tab' });

    expect(listsPane?.classList.contains('focused')).toBe(true);
  });

  it('navigates lists with arrow keys', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    const items = document.querySelectorAll('.lists-pane .item');
    expect(items[0].classList.contains('selected')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[0].classList.contains('selected')).toBe(false);
    expect(items[1].classList.contains('selected')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(items[0].classList.contains('selected')).toBe(true);
  });

  it('navigates tasks with arrow keys when tasks pane focused', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });

    const items = document.querySelectorAll('.tasks-pane .item');
    expect(items[0].classList.contains('selected')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[1].classList.contains('selected')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(items[0].classList.contains('selected')).toBe(true);
  });

  it('clamps selection at boundaries', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    const items = document.querySelectorAll('.lists-pane .item');

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(items[0].classList.contains('selected')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[1].classList.contains('selected')).toBe(true);
  });

  it('loads new tasks when list selection changes', async () => {
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)
      .mockResolvedValueOnce([{ id: 't3', list_id: '2', title: 'Work Task', sort_key: 1, created_at: 0, updated_at: 0 }]);

    setupMockApi({ tasksGetByList });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    await waitFor(() => expect(screen.getByText('Work Task')).toBeDefined());
    expect(tasksGetByList).toHaveBeenCalledWith('2');
  });

  it('shows list name as tasks pane header', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    const headers = document.querySelectorAll('h2');
    expect(headers[1].textContent).toBe('Inbox');
  });

  it('handles empty lists', async () => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue([]),
    });

    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());

    expect(document.querySelectorAll('.lists-pane .item').length).toBe(0);
  });

  it('handles arrow navigation with empty tasks', async () => {
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue([]) });

    render(<App />);
    await waitFor(() => expect(window.api.tasksGetByList).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    expect(document.querySelectorAll('.tasks-pane .item').length).toBe(0);
  });

  // Edit mode tests
  it('enters edit mode on Enter for list', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Enter' });

    const input = document.querySelector('.edit-input') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('Inbox');
  });

  it('enters edit mode on Enter for task', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Enter' });

    const input = document.querySelector('.edit-input') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('Task 1');
  });

  it('cancels edit mode on Escape', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(document.querySelector('.edit-input')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.edit-input')).toBeNull();
  });

  it('Enter does nothing when multi-selection exists', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    // Multi-selection exists
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(true);

    // Enter should not open edit mode
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(document.querySelector('.edit-input')).toBeNull();
  });

  it('commits list edit on Enter', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Enter' });

    const input = document.querySelector('.edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(window.api.listsUpdate).toHaveBeenCalledWith('1', 'New Name');
    });
  });

  it('commits task edit on Enter', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Enter' });

    const input = document.querySelector('.edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Updated Task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Updated Task');
    });
  });

  it('cancels edit on blur', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Enter' });
    const input = document.querySelector('.edit-input') as HTMLInputElement;
    fireEvent.blur(input);

    expect(document.querySelector('.edit-input')).toBeNull();
  });

  it('does not commit empty edit', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Enter' });

    const input = document.querySelector('.edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(window.api.listsUpdate).not.toHaveBeenCalled();
  });

  // Reorder tests
  it('reorders list with Cmd+Shift+Down', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(window.api.listsReorder).toHaveBeenCalledWith('1', 2);
      expect(window.api.listsReorder).toHaveBeenCalledWith('2', 1);
    });
  });

  it('reorders list with Cmd+Shift+Up', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => {
      const items = document.querySelectorAll('.lists-pane .item');
      expect(items[1].classList.contains('selected')).toBe(true);
    });

    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(window.api.listsReorder).toHaveBeenCalled();
    });
  });

  it('reorders task with Cmd+Shift+Down', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(window.api.tasksReorder).toHaveBeenCalledWith('t1', 2);
      expect(window.api.tasksReorder).toHaveBeenCalledWith('t2', 1);
    });
  });

  it('does not reorder at boundary', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true, shiftKey: true });

    expect(window.api.listsReorder).not.toHaveBeenCalled();
  });

  it('reorder clears any existing selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    // Both selected
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(true);

    // Reorder
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });

    // Selection cleared
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(false);
    expect(screen.getByText('Task 2').closest('.item')?.classList.contains('multi-selected')).toBe(false);
  });

  // Move mode tests
  it('enters move mode with M key on tasks pane', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });

    expect(screen.getByText(/Move to:/)).toBeDefined();
  });

  it('ignores other keys in move mode', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });

    // Press a random key - should be ignored
    fireEvent.keyDown(window, { key: 'x' });

    // Move mode should still be active
    expect(screen.getByText(/Move to:/)).toBeDefined();
  });

  it('does not enter move mode on lists pane', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'm' });

    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  it('navigates move target with arrows', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });

    const items = document.querySelectorAll('.lists-pane .item');
    expect(items[0].classList.contains('move-target')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[1].classList.contains('move-target')).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(items[0].classList.contains('move-target')).toBe(true);
  });

  it('cancels move mode with Escape', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.getByText(/Move to:/)).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  it('commits move on Enter', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '2');
    });
  });

  it('does not move to same list', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(window.api.tasksMove).not.toHaveBeenCalled();
  });

  it('handles uppercase M key', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'M' });

    expect(screen.getByText(/Move to:/)).toBeDefined();
  });

  it('does not enter edit mode when no item selected', async () => {
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue([]),
    });

    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(document.querySelector('.edit-input')).toBeNull();
  });

  it('does not enter move mode when no task selected', async () => {
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue([]) });

    render(<App />);
    await waitFor(() => expect(window.api.tasksGetByList).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });

    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  // Create tests
  it('creates new task with Cmd+N', async () => {
    const newTask = { id: 'new', list_id: '1', title: '', sort_key: 3, created_at: 0, updated_at: 0 };
    const updatedTasks = [...mockTasks, newTask];
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)
      .mockResolvedValueOnce(updatedTasks)
      .mockResolvedValueOnce(updatedTasks);

    setupMockApi({
      tasksGetByList,
      tasksCreate: vi.fn().mockResolvedValue(newTask),
    });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'n', metaKey: true });

    await waitFor(() => {
      expect(window.api.tasksCreate).toHaveBeenCalledWith(expect.any(String), '1', '');
    });
  });

  it('creates new list with Cmd+Shift+N', async () => {
    const newList = { id: 'new', name: '', sort_key: 3, created_at: 0, updated_at: 0 };
    const updatedLists = [...mockLists, newList];
    const listsGetAll = vi.fn()
      .mockResolvedValueOnce(mockLists)
      .mockResolvedValueOnce(updatedLists)
      .mockResolvedValueOnce(updatedLists);

    setupMockApi({
      listsGetAll,
      listsCreate: vi.fn().mockResolvedValue(newList),
    });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(window.api.listsCreate).toHaveBeenCalledWith(expect.any(String), '');
    });
  });

  it('does not create task without selected list', async () => {
    const tasksCreate = vi.fn();
    setupMockApi({
      listsGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue([]),
      tasksCreate,
    });

    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'n', metaKey: true });

    expect(tasksCreate).not.toHaveBeenCalled();
  });

  // Multi-select tests
  it('Shift+Arrow extends selection continuously', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    // Focus tasks pane
    fireEvent.keyDown(window, { key: 'Tab' });

    // Hold Shift and press Down
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });

    // Both tasks should have multi-selected class
    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(true);
  });

  it('Shift+Arrow contracts selection when moving back toward anchor', async () => {
    const threeTasks: Task[] = [
      { id: 't1', list_id: '1', title: 'Task 1', sort_key: 1, created_at: 0, updated_at: 0 },
      { id: 't2', list_id: '1', title: 'Task 2', sort_key: 2, created_at: 0, updated_at: 0 },
      { id: 't3', list_id: '1', title: 'Task 3', sort_key: 3, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(threeTasks) });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });

    // All three selected
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(true);
    expect(screen.getByText('Task 2').closest('.item')?.classList.contains('multi-selected')).toBe(true);
    expect(screen.getByText('Task 3').closest('.item')?.classList.contains('multi-selected')).toBe(true);

    // Contract back
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });

    // Task 3 should no longer be selected
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(true);
    expect(screen.getByText('Task 2').closest('.item')?.classList.contains('multi-selected')).toBe(true);
    expect(screen.getByText('Task 3').closest('.item')?.classList.contains('multi-selected')).toBe(false);
  });

  it('releasing Shift keeps multi-selection if more than one item', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Shift clears selection if only one item', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyUp(window, { key: 'Shift' });

    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd shows cursor and selects current item', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' });

    const task1 = screen.getByText('Task 1').closest('.item');
    // First item shows cursor and is multi-selected
    expect(task1?.classList.contains('cursor')).toBe(true);
    expect(task1?.classList.contains('multi-selected')).toBe(true);
  });

  it('Cmd+Arrow moves cursor without selecting', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });

    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task1?.classList.contains('cursor')).toBe(false);
    expect(task2?.classList.contains('cursor')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd+Enter toggles selection at cursor', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' });

    // Task1 is auto-selected when Cmd pressed
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);

    // Toggle off
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(task1?.classList.contains('multi-selected')).toBe(false);

    // Toggle back on
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(task1?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Cmd hides cursor but keeps selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' }); // Auto-selects task1
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true }); // Select task2
    fireEvent.keyUp(window, { key: 'Meta' });

    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('cursor')).toBe(false);
  });

  it('Space without Cmd clears selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    // Both selected
    let task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);

    // Space clears
    fireEvent.keyDown(window, { key: ' ' });
    task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('Arrow without modifier clears selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    // Both selected
    let task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);

    // Arrow without modifier clears
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('Esc clears selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    // Both selected
    let task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);

    // Esc clears
    fireEvent.keyDown(window, { key: 'Escape' });
    task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('M moves all selected tasks', async () => {
    const tasksMove = vi.fn().mockResolvedValue(undefined);
    setupMockApi({ tasksMove });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(tasksMove).toHaveBeenCalledTimes(2);
      expect(tasksMove).toHaveBeenCalledWith('t1', '2');
      expect(tasksMove).toHaveBeenCalledWith('t2', '2');
    });
  });

  it('Cmd+Space does nothing when boundaryCursor is null', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    // Don't press Meta first, so boundaryCursor stays null
    // Simulate cmdHeld being true but boundaryCursor null (edge case)
    fireEvent.keyDown(window, { key: ' ' });

    // Should not crash, selection should be cleared
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('releasing Cmd with multiple items keeps selection until arrow without modifier', async () => {
    const threeTasks: Task[] = [
      { id: 't1', list_id: '1', title: 'Task 1', sort_key: 1, created_at: 0, updated_at: 0 },
      { id: 't2', list_id: '1', title: 'Task 2', sort_key: 2, created_at: 0, updated_at: 0 },
      { id: 't3', list_id: '1', title: 'Task 3', sort_key: 3, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(threeTasks) });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });

    // Select task1 (auto) and task3 using Cmd
    fireEvent.keyDown(window, { key: 'Meta' }); // Auto-selects task1
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true }); // Select task3
    fireEvent.keyUp(window, { key: 'Meta' });

    // Verify both are still selected after releasing Meta
    const task1 = screen.getByText('Task 1').closest('.item');
    const task3 = screen.getByText('Task 3').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task3?.classList.contains('multi-selected')).toBe(true);
  });

  it('single item selection clears when modifier released', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' }); // Auto-selects task1
    fireEvent.keyUp(window, { key: 'Meta' });

    // Single item selection should be cleared
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('task edit input loses focus on blur', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Enter' });

    const input = screen.getByDisplayValue('Task 1');
    fireEvent.blur(input);

    // Edit mode should be cancelled
    expect(screen.queryByDisplayValue('Task 1')).toBeNull();
    expect(screen.getByText('Task 1')).toBeDefined();
  });

  it('Shift in lists pane does not trigger multi-select', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    // Stay in lists pane and press Shift
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });

    // Tasks should not have multi-selected class
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('Meta in lists pane does not trigger multi-select', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    // Stay in lists pane and press Meta
    fireEvent.keyDown(window, { key: 'Meta' });

    // Tasks should not have boundary-cursor class
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('boundary-cursor')).toBe(false);
  });

  it('Shift+Arrow selects multiple then releasing keeps selection', async () => {
    const threeTasks: Task[] = [
      { id: 't1', list_id: '1', title: 'Task 1', sort_key: 1, created_at: 0, updated_at: 0 },
      { id: 't2', list_id: '1', title: 'Task 2', sort_key: 2, created_at: 0, updated_at: 0 },
      { id: 't3', list_id: '1', title: 'Task 3', sort_key: 3, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(threeTasks) });

    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });

    await waitFor(() => {
      const task3 = screen.getByText('Task 3').closest('.item');
      expect(task3?.classList.contains('multi-selected')).toBe(true);
    });

    fireEvent.keyUp(window, { key: 'Shift' });

    // All three should still be selected
    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    const task3 = screen.getByText('Task 3').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(true);
    expect(task3?.classList.contains('multi-selected')).toBe(true);
  });

  it('Cmd+Return when not in tasks pane does nothing', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    // Stay in lists pane, simulate cmdHeld state by pressing Meta then Enter
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });

    // Should not crash, no selection changes
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('Tab clears selection when switching panes', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    // Both selected
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(true);

    // Switch panes
    fireEvent.keyDown(window, { key: 'Tab' });

    // Selection should be cleared
    expect(screen.getByText('Task 1').closest('.item')?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd+Arrow clamps at list boundaries', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' });

    // Try to go above first item
    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true });

    // Cursor should stay on first item
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('cursor')).toBe(true);
  });

  it('Shift+Arrow clamps at list boundaries', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });

    // Try to go above first item
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });

    // Should only have first item selected
    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd hides selected highlight, shows only cursor and multi-selected', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });

    // Normal selection visible
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('selected')).toBe(true);

    // Press Cmd - selected hidden, cursor and multi-selected shown
    fireEvent.keyDown(window, { key: 'Meta' });
    expect(task1?.classList.contains('selected')).toBe(false);
    expect(task1?.classList.contains('cursor')).toBe(true);
    expect(task1?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Cmd moves cursor to boundaryCursor position', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    fireEvent.keyUp(window, { key: 'Meta' });

    // Cursor should now be on Task 2 (moved down once)
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task2?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+Enter toggles item off from selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Meta' });

    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);

    // Toggle off
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(task1?.classList.contains('multi-selected')).toBe(false);

    // Toggle back on
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(task1?.classList.contains('multi-selected')).toBe(true);
  });

  it('Space clears multi-selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(window, { key: 'Shift' });

    const task1 = screen.getByText('Task 1').closest('.item');
    const task2 = screen.getByText('Task 2').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(true);
    expect(task2?.classList.contains('multi-selected')).toBe(true);

    // Space clears selection
    fireEvent.keyDown(window, { key: ' ' });
    expect(task1?.classList.contains('multi-selected')).toBe(false);
    expect(task2?.classList.contains('multi-selected')).toBe(false);
  });

  it('Shift keydown does not auto-add to selection', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Shift' });

    // Just pressing Shift should not add anything to selection
    const task1 = screen.getByText('Task 1').closest('.item');
    expect(task1?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd+, opens settings modal', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('Theme')).toBeDefined();
  });

  it('Esc closes settings modal', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(screen.getByText('Settings')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('arrow keys navigate theme options in settings', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: ',', metaKey: true });

    // System is selected by default (index 2, since order is Light, Dark, System)
    const cards = document.querySelectorAll('.theme-card');
    expect(cards[2]?.classList.contains('selected')).toBe(true);

    // Move left to Dark
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(cards[1]?.classList.contains('selected')).toBe(true);

    // Move left to Light
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(cards[0]?.classList.contains('selected')).toBe(true);

    // Move right back to Dark
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(cards[1]?.classList.contains('selected')).toBe(true);
  });

  it('Enter applies selected theme and closes settings', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: ',', metaKey: true });
    // Default is System (index 2), move left twice to Light
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.queryByText('Settings')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
