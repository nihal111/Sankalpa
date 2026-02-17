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

beforeEach(() => {
  window.api = {
    listsGetAll: vi.fn().mockResolvedValue(mockLists),
    tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
  } as unknown as typeof window.api;
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

    fireEvent.keyDown(window, { key: 'Tab' }); // Focus tasks pane

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

    // Try to go above first item
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(items[0].classList.contains('selected')).toBe(true);

    // Go to last item and beyond
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[1].classList.contains('selected')).toBe(true);
  });

  it('loads new tasks when list selection changes', async () => {
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)
      .mockResolvedValueOnce([{ id: 't3', list_id: '2', title: 'Work Task', sort_key: 1, created_at: 0, updated_at: 0 }]);

    window.api = {
      listsGetAll: vi.fn().mockResolvedValue(mockLists),
      tasksGetByList,
    } as unknown as typeof window.api;

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
    window.api = {
      listsGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue([]),
    } as unknown as typeof window.api;

    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());

    expect(document.querySelectorAll('.lists-pane .item').length).toBe(0);
  });

  it('handles arrow navigation with empty tasks', async () => {
    window.api = {
      listsGetAll: vi.fn().mockResolvedValue(mockLists),
      tasksGetByList: vi.fn().mockResolvedValue([]),
    } as unknown as typeof window.api;

    render(<App />);
    await waitFor(() => expect(window.api.tasksGetByList).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'Tab' }); // Focus tasks pane

    // Should not crash with empty tasks
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    expect(document.querySelectorAll('.tasks-pane .item').length).toBe(0);
  });

  it('ignores unhandled keys', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());

    const items = document.querySelectorAll('.lists-pane .item');
    expect(items[0].classList.contains('selected')).toBe(true);

    // Press unhandled key - selection should not change
    fireEvent.keyDown(window, { key: 'x' });
    expect(items[0].classList.contains('selected')).toBe(true);
  });
});
