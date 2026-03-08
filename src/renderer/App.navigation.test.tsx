import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList, navigateToItem } from './test-utils';

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
      expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined();
      expect(screen.getByText('Task 2', { selector: '.task-content' })).toBeDefined();
    });
  });

  it('switches pane focus with ArrowRight and ArrowLeft', async () => {
    render(<App />);
    await navigateToUserList();
    const listsPane = document.querySelector('.lists-pane');
    const tasksPane = document.querySelector('.tasks-pane');
    expect(listsPane?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(listsPane?.classList.contains('focused')).toBe(false);
    expect(tasksPane?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(listsPane?.classList.contains('focused')).toBe(true);
  });

  it('navigates lists with arrow keys', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const items = document.querySelectorAll('.lists-pane .item');
    expect(items[0]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(items[0]?.classList.contains('selected')).toBe(false);
    // Skips hidden Overdue (index 1) to Today (index 2)
    expect(items[2]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+0 selects Inbox', async () => {
    render(<App />);
    await navigateToItem('Today');
    fireEvent.keyDown(window, { key: '0', metaKey: true });
    await waitFor(() => {
      const selected = document.querySelector('.lists-pane .item.selected');
      expect(selected?.textContent).toContain('Inbox');
    });
  });

  it('navigates tasks with arrow keys when tasks pane focused', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
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
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: 'ArrowUp' });
    }
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(true);
  });

  it('loads new tasks when list selection changes', async () => {
    render(<App />);
    await navigateToUserList();
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
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
    fireEvent.keyDown(window, { key: 'ArrowRight' });
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
    fireEvent.keyDown(window, { key: 'ArrowRight' });
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

  it('navigating to Completed smart list loads completed tasks', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({
      tasksGetCompleted: vi.fn().mockResolvedValue(completedTasks),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Completed')).toBeDefined());
    await navigateToItem('Completed');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Done Task', { selector: '.task-content' })).toBeDefined());
    expect(window.api.tasksGetCompleted).toHaveBeenCalled();
  });

  it('Option+O opens selected smart-list task in its source list', async () => {
    const todayTask = { id: 'today-1', list_id: '2', title: 'Today Work Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: 1, duration: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 };
    const workTasks = [todayTask];
    setupMockApi({
      tasksGetDueBetween: vi.fn().mockResolvedValue([todayTask]),
      tasksGetByList: vi.fn().mockResolvedValue(workTasks),
      listsGetTaskCount: vi.fn().mockResolvedValue(1),
    });
    render(<App />);
    await navigateToItem('Today');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Today Work Task', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'o', altKey: true, code: 'KeyO' });
    await waitFor(() => expect(window.api.tasksGetByList).toHaveBeenCalledWith('2'));
    await waitFor(() => {
      const selectedList = document.querySelector('.lists-pane .item.selected');
      expect(selectedList?.textContent).toContain('Work');
      const selectedTask = document.querySelector('.tasks-pane .item.selected .task-content');
      expect(selectedTask?.textContent).toBe('Today Work Task');
    });
  });

  it('Option+O opens Inbox when selected smart-list task belongs to inbox', async () => {
    const inboxTask = { id: 'done-inbox-1', list_id: null, title: 'Inbox Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, duration: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 };
    setupMockApi({
      tasksGetCompleted: vi.fn().mockResolvedValue([inboxTask]),
      tasksGetInbox: vi.fn().mockResolvedValue([inboxTask]),
    });
    render(<App />);
    await navigateToItem('Completed');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Inbox Done Task', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'o', altKey: true, code: 'KeyO' });
    await waitFor(() => {
      const selectedList = document.querySelector('.lists-pane .item.selected');
      expect(selectedList?.textContent).toContain('Inbox');
      const selectedTask = document.querySelector('.tasks-pane .item.selected .task-content');
      expect(selectedTask?.textContent).toBe('Inbox Done Task');
    });
  });

  it('Option+O does nothing on smart Inbox', async () => {
    const inboxTask = { id: 'inbox-1', list_id: null, title: 'Inbox Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, duration: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 };
    setupMockApi({
      tasksGetInbox: vi.fn().mockResolvedValue([inboxTask]),
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Inbox Task', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'o', altKey: true, code: 'KeyO' });
    await waitFor(() => {
      const selectedList = document.querySelector('.lists-pane .item.selected');
      expect(selectedList?.textContent).toContain('Inbox');
      const selectedTask = document.querySelector('.tasks-pane .item.selected .task-content');
      expect(selectedTask?.textContent).toBe('Inbox Task');
    });
    expect(window.api.tasksGetByList).not.toHaveBeenCalled();
  });

  it('Option+O falls back to first task when target list does not contain selected task', async () => {
    const todayTask = { id: 'today-missing', list_id: '2', title: 'Today Missing Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: 1, duration: null, notes: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 };
    const existingTask = { id: 'work-1', list_id: '2', title: 'Existing Work Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, duration: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 };
    setupMockApi({
      tasksGetDueBetween: vi.fn().mockResolvedValue([todayTask]),
      tasksGetByList: vi.fn().mockResolvedValue([existingTask]),
      listsGetTaskCount: vi.fn().mockResolvedValue(1),
    });
    render(<App />);
    await navigateToItem('Today');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Today Missing Task', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'o', altKey: true, code: 'KeyO' });
    await waitFor(() => {
      const selectedList = document.querySelector('.lists-pane .item.selected');
      expect(selectedList?.textContent).toContain('Work');
      const selectedTask = document.querySelector('.tasks-pane .item.selected .task-content');
      expect(selectedTask?.textContent).toBe('Existing Work Task');
    });
  });

  it('Option+O does nothing when source list no longer exists', async () => {
    const todayTask = { id: 'today-orphan', list_id: '999', title: 'Orphaned Source Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: 1, duration: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 };
    setupMockApi({
      tasksGetDueBetween: vi.fn().mockResolvedValue([todayTask]),
      listsGetTaskCount: vi.fn().mockResolvedValue(1),
    });
    render(<App />);
    await navigateToItem('Today');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Orphaned Source Task', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'o', altKey: true, code: 'KeyO' });
    await waitFor(() => {
      const selectedList = document.querySelector('.lists-pane .item.selected');
      expect(selectedList?.textContent).toContain('Today');
      const selectedTask = document.querySelector('.tasks-pane .item.selected .task-content');
      expect(selectedTask?.textContent).toBe('Orphaned Source Task');
    });
    expect(window.api.tasksGetByList).not.toHaveBeenCalled();
  });

  it('Cmd+Enter toggles task completion from tasks pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('t1'));
  });

  it('Cmd+Enter on parent task shows cascade confirmation', async () => {
    const parentChild = [
      { id: 'p1', list_id: '1', title: 'Parent', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
      { id: 'c1', list_id: '1', title: 'Child', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, parent_id: 'p1', is_expanded: 1 },
    ];
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(parentChild) });
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Parent', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(screen.getByText('Complete All')).toBeDefined());
    // Confirm cascade
    fireEvent.click(screen.getByText('Complete All'));
    await waitFor(() => expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('c1'));
  });

  it('Delete on parent task shows cascade delete confirmation', async () => {
    const parentChild = [
      { id: 'p1', list_id: '1', title: 'Parent', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
      { id: 'c1', list_id: '1', title: 'Child', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, parent_id: 'p1', is_expanded: 1 },
    ];
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(parentChild) });
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Parent', { selector: '.task-content' })).toBeDefined());
    fireEvent.keyDown(window, { key: 'Backspace' });
    await waitFor(() => expect(screen.getByText('Delete All')).toBeDefined());
    fireEvent.click(screen.getByText('Delete All'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(window.api.tasksSoftDelete).toHaveBeenCalledWith('c1'));
  });

  it('right arrow on list in sidebar focuses tasks pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.querySelector('.tasks-pane')?.classList.contains('focused')).toBe(true);
  });

  it('left arrow on nested list navigates to parent folder', async () => {
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue([
        { id: 'f1', name: 'Folder', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
      ]),
      listsGetAll: vi.fn().mockResolvedValue([
        { id: '1', folder_id: 'f1', name: 'Nested', notes: null, sort_key: 1, created_at: 0, updated_at: 0 },
      ]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Nested')).toBeDefined());
    await navigateToItem('Nested');
    // Verify we're on the nested list by checking tasks header
    await waitFor(() => {
      const header = document.querySelector('.tasks-pane h2');
      expect(header?.textContent).toBe('Nested');
    });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    // Should navigate to parent folder
    const sidebar = document.querySelector('.lists-pane')!;
    await waitFor(() => expect(within(sidebar as HTMLElement).getByText('Folder').closest('li')?.classList.contains('selected')).toBe(true));
  });

  it('left arrow in tasks pane switches to lists pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.querySelector('.tasks-pane')?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(document.querySelector('.lists-pane')?.classList.contains('focused')).toBe(true);
  });

  it('right arrow in tasks pane does not switch pane', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.querySelector('.tasks-pane')?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.querySelector('.tasks-pane')?.classList.contains('focused')).toBe(true);
  });

  it('toggling task on Completed list reloads completed tasks', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
    ];
    const getCompletedMock = vi.fn().mockResolvedValue(completedTasks);
    setupMockApi({
      tasksGetCompleted: getCompletedMock,
      tasksToggleCompleted: vi.fn().mockResolvedValue(undefined),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Completed')).toBeDefined());
    await navigateToItem('Completed');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Done Task', { selector: '.task-content' })).toBeDefined());
    const callsBefore = getCompletedMock.mock.calls.length;
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('ct1'));
    // reloadTasks should call tasksGetCompleted again
    await waitFor(() => expect(getCompletedMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('completed filter bar changes list filter', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null },
    ];
    const getCompletedMock = vi.fn().mockResolvedValue(completedTasks);
    setupMockApi({ tasksGetCompleted: getCompletedMock });
    render(<App />);
    await navigateToItem('Completed');
    await waitFor(() => expect(screen.getByLabelText('Filter by project')).toBeDefined());
    const select = screen.getByLabelText('Filter by project') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() => expect(getCompletedMock).toHaveBeenCalled());
  });

  it('completed filter bar filters by inbox (null list)', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: null, title: 'Inbox Done', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: Date.now(), due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
      { id: 'ct2', list_id: '1', title: 'List Done', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: Date.now(), due_date: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({ tasksGetCompleted: vi.fn().mockResolvedValue(completedTasks) });
    render(<App />);
    await navigateToItem('Completed');
    await waitFor(() => expect(screen.getByLabelText('Filter by project')).toBeDefined());
    // Both tasks visible initially
    await waitFor(() => expect(screen.getByText('Inbox Done', { selector: '.task-content' })).toBeDefined());
    expect(screen.getByText('List Done', { selector: '.task-content' })).toBeDefined();
    // Filter to inbox
    const select = screen.getByLabelText('Filter by project') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'null' } });
    await waitFor(() => expect(screen.getByText('Inbox Done', { selector: '.task-content' })).toBeDefined());
    expect(screen.queryByText('List Done')).toBeNull();
  });

  it('completed filter bar resets to all projects', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: Date.now(), due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({ tasksGetCompleted: vi.fn().mockResolvedValue(completedTasks) });
    render(<App />);
    await navigateToItem('Completed');
    await waitFor(() => expect(screen.getByLabelText('Filter by project')).toBeDefined());
    const select = screen.getByLabelText('Filter by project') as HTMLSelectElement;
    // Filter to specific list, then back to all
    fireEvent.change(select, { target: { value: 'null' } });
    await waitFor(() => expect(screen.queryByText('Done Task', { selector: '.task-content' })).toBeNull());
    fireEvent.change(select, { target: { value: 'all' } });
    await waitFor(() => expect(screen.getByText('Done Task', { selector: '.task-content' })).toBeDefined());
  });

  it('completed filter bar changes date range filter', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null },
    ];
    setupMockApi({ tasksGetCompleted: vi.fn().mockResolvedValue(completedTasks) });
    render(<App />);
    await navigateToItem('Completed');
    await waitFor(() => expect(screen.getByLabelText('Filter by date range')).toBeDefined());
    const select = screen.getByLabelText('Filter by date range') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'today' } });
    expect(select.value).toBe('today');
  });

  it('completed filter bar shows custom date inputs when custom selected', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null },
    ];
    setupMockApi({ tasksGetCompleted: vi.fn().mockResolvedValue(completedTasks) });
    render(<App />);
    await navigateToItem('Completed');
    await waitFor(() => expect(screen.getByLabelText('Filter by date range')).toBeDefined());
    const select = screen.getByLabelText('Filter by date range') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'custom' } });
    await waitFor(() => expect(screen.getByLabelText('Start date')).toBeDefined());
    expect(screen.getByLabelText('End date')).toBeDefined();
    // Change custom dates
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2026-01-01' } });
    fireEvent.change(endInput, { target: { value: '2026-01-31' } });
    expect(startInput.value).toBe('2026-01-01');
    expect(endInput.value).toBe('2026-01-31');
    // Clear dates
    fireEvent.change(startInput, { target: { value: '' } });
    fireEvent.change(endInput, { target: { value: '' } });
    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');
  });

  it('F key cycles through filter controls on Completed view', async () => {
    const completedTasks = [
      { id: 'ct1', list_id: '1', title: 'Done Task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null },
    ];
    setupMockApi({ tasksGetCompleted: vi.fn().mockResolvedValue(completedTasks) });
    render(<App />);
    await navigateToItem('Completed');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByLabelText('Filter by project')).toBeDefined());
    // F focuses first filter
    fireEvent.keyDown(window, { key: 'f' });
    expect(document.activeElement).toBe(screen.getByLabelText('Filter by project'));
    // F again cycles to next filter
    fireEvent.keyDown(window, { key: 'f' });
    expect(document.activeElement).toBe(screen.getByLabelText('Filter by date range'));
    // Escape blurs back
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).not.toBe(screen.getByLabelText('Filter by date range'));
  });
});
