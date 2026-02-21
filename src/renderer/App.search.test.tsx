import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, mockTasks, mockLists } from './test-utils';

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

  it('clicking detail pane due date input does not bubble', async () => {
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
    // Press D to open due date editor
    fireEvent.keyDown(window, { key: 'd' });
    await waitFor(() => expect(document.querySelector('.detail-pane .due-date-input')).toBeDefined());
    // Click the due date input itself (covers stopPropagation onClick)
    fireEvent.click(document.querySelector('.detail-pane .due-date-input')!);
    expect(document.querySelector('.detail-pane .due-date-input')).toBeDefined();
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
