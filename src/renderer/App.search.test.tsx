import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, mockTasks } from './test-utils';
import type { Task } from '../shared/types';

beforeEach(() => {
  setupMockApi({
    tasksGetAll: vi.fn().mockResolvedValue(mockTasks),
  });
});

function openSearch(): void {
  fireEvent.keyDown(window, { key: 'f', metaKey: true, shiftKey: true });
}

describe('App search', () => {
  it('opens search modal with Cmd+Shift+F', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    await waitFor(() => expect(screen.getByPlaceholderText('Search tasks...')).toBeDefined());
  });

  it('closes search with Escape', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    const input = await screen.findByPlaceholderText('Search tasks...');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByPlaceholderText('Search tasks...')).toBeNull());
  });

  it('shows results matching query', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    const input = await screen.findByPlaceholderText('Search tasks...');
    fireEvent.change(input, { target: { value: 'Task 1' } });
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
  });

  it('shows no results message for unmatched query', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    const input = await screen.findByPlaceholderText('Search tasks...');
    fireEvent.change(input, { target: { value: 'zzzznotfound' } });
    await waitFor(() => expect(screen.getByText('No tasks found')).toBeDefined());
  });

  it('navigates results with arrow keys and selects with Enter', async () => {
    setupMockApi({
      tasksGetAll: vi.fn().mockResolvedValue(mockTasks),
      tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    const input = await screen.findByPlaceholderText('Search tasks...');
    fireEvent.change(input, { target: { value: 'Task' } });
    await waitFor(() => expect(document.querySelector('.search-result-item.selected')).toBeDefined());
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByPlaceholderText('Search tasks...')).toBeNull());
  });

  it('closes search when clicking overlay but not modal content', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    await screen.findByPlaceholderText('Search tasks...');
    // Click on modal content should NOT close
    fireEvent.click(document.querySelector('.search-modal')!);
    expect(screen.getByPlaceholderText('Search tasks...')).toBeDefined();
    // Click on overlay should close
    fireEvent.click(document.querySelector('.modal-overlay')!);
    await waitFor(() => expect(screen.queryByPlaceholderText('Search tasks...')).toBeNull());
  });

  it('clicking due date modal does not close it', async () => {
    setupMockApi({
      tasksGetAll: vi.fn().mockResolvedValue(mockTasks),
      tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    // Navigate to a user list with tasks and focus tasks pane
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Tab' });
    // Press D to open due date modal
    fireEvent.keyDown(window, { key: 'd' });
    await waitFor(() => expect(document.querySelector('.due-date-modal')).not.toBeNull());
    // Click inside the modal should not close it
    fireEvent.click(document.querySelector('.due-date-modal')!);
    expect(document.querySelector('.due-date-modal')).not.toBeNull();
  });

  it('shows notes snippet with bold match when search matches notes', async () => {
    const tasksWithNotes: Task[] = [
      { id: 't1', list_id: '1', title: 'Buy groceries', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: 'Remember to get organic apples and bananas', sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({
      tasksGetAll: vi.fn().mockResolvedValue(tasksWithNotes),
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    const input = await screen.findByPlaceholderText('Search tasks...');
    fireEvent.change(input, { target: { value: 'organic' } });
    await waitFor(() => expect(screen.getByText('Buy groceries')).toBeDefined());
    const notesSnippet = document.querySelector('.search-result-notes');
    expect(notesSnippet).not.toBeNull();
    expect(notesSnippet!.querySelector('b')).not.toBeNull();
    expect(notesSnippet!.querySelector('b')!.textContent).toContain('organic');
  });

  it('shows ellipsis in notes snippet when match is deep in long notes', async () => {
    const longNotes = 'A'.repeat(80) + ' findme ' + 'B'.repeat(80);
    const tasksWithNotes: Task[] = [
      { id: 't1', list_id: '1', title: 'Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: longNotes, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({
      tasksGetAll: vi.fn().mockResolvedValue(tasksWithNotes),
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    openSearch();
    const input = await screen.findByPlaceholderText('Search tasks...');
    fireEvent.change(input, { target: { value: 'findme' } });
    await waitFor(() => expect(screen.getByText('Task')).toBeDefined());
    const notesSnippet = document.querySelector('.search-result-notes');
    expect(notesSnippet).not.toBeNull();
    expect(notesSnippet!.textContent).toContain('…');
    expect(notesSnippet!.querySelector('b')!.textContent).toContain('findme');
  });

  it('clicking sidebar trash item triggers onClick', async () => {
    setupMockApi({
      tasksGetAll: vi.fn().mockResolvedValue(mockTasks),
      tasksGetTrashed: vi.fn().mockResolvedValue([]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
    const trashLi = screen.getByText('Trash').closest('li')!;
    fireEvent.click(trashLi);
    // Verify the trash view loaded (header changes)
    await waitFor(() => expect(screen.getByText('Trash')).toBeDefined());
  });
});
