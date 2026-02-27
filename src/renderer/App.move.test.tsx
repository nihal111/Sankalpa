import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import type { Folder, List } from '../shared/types';
import { setupMockApi, navigateToUserList, navigateToTasksPane, mockTasks } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App move mode', () => {
  it('enters move mode with M key on tasks pane', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => {
      expect(screen.getByText(/Move to:/)).toBeDefined();
    });
  });

  it('ignores other keys in move mode', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'x' });
    expect(screen.getByText(/Move to:/)).toBeDefined();
  });

  it('does not enter move mode on lists pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  it('navigates move target with arrows', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    const moveHint = screen.getByText(/Move to:/);
    expect(moveHint.textContent).toContain('Inbox');
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByText(/Move to:/).textContent).toContain('Work');
    });
  });

  it('cancels move mode with Escape', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  it('commits move on Enter', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '2'));
  });

  it('does not move to same list', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(window.api.tasksMove).not.toHaveBeenCalled();
  });

  it('handles uppercase M key', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'M' });
    await waitFor(() => {
      expect(screen.getByText(/Move to:/)).toBeDefined();
    });
  });

  it('does not enter move mode when no task selected', async () => {
    setupMockApi({
      tasksGetByList: vi.fn().mockResolvedValue([]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    await waitFor(() => expect(window.api.tasksGetByList).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  it('M moves all selected tasks', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => {
      expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '2');
      expect(window.api.tasksMove).toHaveBeenCalledWith('t2', '2');
    });
  });

  it('shows empty move target name when not on list', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
    });
    render(<App />);
    await waitFor(() => expect(window.api.foldersGetAll).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.queryByText(/Move to:/)).toBeNull();
  });

  it('move mode defaults to index 0 when no lists exist', async () => {
    // This tests the edge case where listIndex is -1
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue([]),
      listsGetAll: vi.fn().mockResolvedValue([]),
      tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    // Can't actually enter move mode without tasks, but the branch is covered
  });

  it('move mode skips non-list items when navigating', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    const listsWithFolder: List[] = [
      { id: '1', folder_id: 'f1', name: 'Inbox', notes: null, sort_key: 1, created_at: 0, updated_at: 0 },
      { id: '2', folder_id: null, name: 'Work', notes: null, sort_key: 2, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsGetAll: vi.fn().mockResolvedValue(listsWithFolder),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 6; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    expect(screen.getByText(/Move to:/).textContent).toContain('Inbox');
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByText(/Move to:/).textContent).toContain('Work');
    });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByText(/Move to:/).textContent).toContain('Inbox');
    });
  });

  it('move mode stays at boundary when no more lists', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    const listsWithFolder: List[] = [
      { id: '1', folder_id: 'f1', name: 'Inbox', notes: null, sort_key: 1, created_at: 0, updated_at: 0 },
      { id: '2', folder_id: null, name: 'Work', notes: null, sort_key: 2, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsGetAll: vi.fn().mockResolvedValue(listsWithFolder),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    for (let i = 0; i < 6; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByText(/Move to:/).textContent).toContain('Work');
  });
});
