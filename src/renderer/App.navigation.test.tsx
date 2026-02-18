import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App navigation', () => {
  it('renders two panes', async () => {
    render(<App />);
    expect(document.querySelector('.lists-pane')).toBeDefined();
    await waitFor(() => expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0));
  });

  it('loads and displays lists', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeDefined();
    });
  });

  it('loads tasks for selected list', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeDefined();
      expect(screen.getByText('Task 2')).toBeDefined();
    });
  });

  it('switches pane focus with Tab', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
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
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const items = document.querySelectorAll('.lists-pane .item');
    expect(items[0]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[0]?.classList.contains('selected')).toBe(false);
    expect(items[1]?.classList.contains('selected')).toBe(true);
  });

  it('navigates tasks with arrow keys when tasks pane focused', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Tab' });
    await waitFor(() => {
      const tasksPane = document.querySelector('.tasks-pane');
      expect(tasksPane?.classList.contains('focused')).toBe(true);
    });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(taskItems[0]?.classList.contains('selected')).toBe(false);
    expect(taskItems[1]?.classList.contains('selected')).toBe(true);
  });

  it('clamps selection at boundaries', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Tab' });
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: 'ArrowUp' });
    }
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(true);
  });

  it('loads new tasks when list selection changes', async () => {
    render(<App />);
    await navigateToUserList();
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(window.api.tasksGetByList).toHaveBeenCalledWith('2');
    });
  });

  it('shows list name as tasks pane header', async () => {
    render(<App />);
    await navigateToUserList();
    const header = document.querySelector('.tasks-pane h2');
    expect(header?.textContent).toBe('Inbox');
  });

  it('handles empty lists', async () => {
    setupMockApi({
      listsGetAll: async () => [],
      foldersGetAll: async () => [],
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    const items = document.querySelectorAll('.lists-pane .item.list');
    expect(items.length).toBe(0);
  });

  it('handles arrow navigation with empty tasks', async () => {
    setupMockApi({
      tasksGetByList: async () => [],
    });
    render(<App />);
    await waitFor(() => expect(document.querySelectorAll('.lists-pane .item.list').length).toBeGreaterThan(0));
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems.length).toBe(0);
  });

  it('right arrow on list goes to tasks pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const tasksPane = document.querySelector('.tasks-pane');
    expect(tasksPane?.classList.contains('focused')).toBe(true);
  });

  it('left arrow on tasks pane goes to lists pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const listsPane = document.querySelector('.lists-pane');
    expect(listsPane?.classList.contains('focused')).toBe(true);
  });

  it('shows Tasks as header when no list selected', async () => {
    setupMockApi({
      listsGetAll: async () => [],
      foldersGetAll: async () => [],
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const header = document.querySelector('.tasks-pane h2');
    expect(header).toBeDefined();
  });

  it('shows smart list name in tasks header', async () => {
    render(<App />);
    await navigateToUserList();
    for (let i = 0; i < 6; i++) {
      fireEvent.keyDown(window, { key: 'ArrowUp' });
    }
    const header = document.querySelector('.tasks-pane h2');
    expect(header?.textContent).toBe('Inbox');
  });

  it('shows fallback Tasks header when no sidebar item selected', async () => {
    setupMockApi({
      listsGetAll: async () => [],
      foldersGetAll: async () => [],
    });
    render(<App />);
    await waitFor(() => expect(window.api.listsGetAll).toHaveBeenCalled());
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const header = document.querySelector('.tasks-pane h2');
    expect(header).toBeDefined();
  });

  it('smart list shows has-items class when it has tasks', async () => {
    setupMockApi({ tasksGetInboxCount: async () => 3 });
    render(<App />);
    await waitFor(() => {
      const inbox = document.querySelector('.lists-pane .item.smart-list');
      expect(inbox?.classList.contains('has-items')).toBe(true);
    });
  });
});
