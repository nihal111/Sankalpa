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

  // Move mode tests
  it('enters move mode with M key on tasks pane', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'm' });

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
});
