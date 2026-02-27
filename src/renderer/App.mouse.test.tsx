import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi } from './test-utils';

describe('App mouse interactions', () => {
  beforeEach(() => {
    // Default: hardcore mode disabled (mouse enabled)
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
  });

  it('clicking a list selects it', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.click(workItem!);
    await waitFor(() => expect(workItem?.classList.contains('selected')).toBe(true));
  });

  it('clicking a task selects it and focuses tasks pane', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    // Navigate to Work list first
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.click(workItem!);
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    // Click second task
    const task2 = screen.getByText('Task 2', { selector: '.task-content' }).closest('li');
    fireEvent.click(task2!);
    await waitFor(() => expect(task2?.classList.contains('selected')).toBe(true));
    expect(document.querySelector('.tasks-pane')?.classList.contains('focused')).toBe(true);
  });

  it('clicking folder icon toggles expand/collapse', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }),
      foldersGetAll: () => Promise.resolve([{ id: 'f1', name: 'Folder', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 }]),
      listsGetAll: () => Promise.resolve([{ id: '1', folder_id: 'f1', name: 'Nested List', notes: null, sort_key: 1, created_at: 0, updated_at: 0 }]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Folder')).toBeDefined());
    const folderIcon = screen.getByText('Folder').closest('li')?.querySelector('.item-icon');
    fireEvent.click(folderIcon!);
    await waitFor(() => expect(window.api.foldersToggleExpanded).toHaveBeenCalledWith('f1'));
  });

  it('clicking does nothing in hardcore mode', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }) });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    // Smart Inbox is first item and selected by default
    const smartLists = document.querySelectorAll('.smart-list');
    expect(smartLists[0]?.classList.contains('selected')).toBe(true);
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.click(workItem!);
    // Should still be on smart Inbox
    await waitFor(() => expect(smartLists[0]?.classList.contains('selected')).toBe(true));
    expect(workItem?.classList.contains('selected')).toBe(false);
  });

  it('clicking task does nothing in hardcore mode', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }) });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    // Navigate to tasks via keyboard
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li');
    const task2 = screen.getByText('Task 2', { selector: '.task-content' }).closest('li');
    expect(task1?.classList.contains('selected')).toBe(true);
    fireEvent.click(task2!);
    // Should still be on Task 1
    expect(task1?.classList.contains('selected')).toBe(true);
  });

  it('clicking folder icon does nothing in hardcore mode', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }),
      foldersGetAll: () => Promise.resolve([{ id: 'f1', name: 'Folder', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 }]),
      listsGetAll: () => Promise.resolve([{ id: '1', folder_id: 'f1', name: 'Nested', notes: null, sort_key: 1, created_at: 0, updated_at: 0 }]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Folder')).toBeDefined());
    const folderIcon = screen.getByText('Folder').closest('li')?.querySelector('.item-icon');
    fireEvent.click(folderIcon!);
    expect(window.api.foldersToggleExpanded).not.toHaveBeenCalled();
  });
});

describe('Sidebar resize', () => {
  beforeEach(() => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
  });

  it('resizes sidebar on drag', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const handle = document.querySelector('.sidebar-resize-handle') as HTMLElement;
    const sidebar = document.querySelector('.lists-pane') as HTMLElement;
    Object.defineProperty(sidebar, 'offsetWidth', { value: 240 });
    fireEvent.mouseDown(handle, { clientX: 240 });
    fireEvent.mouseMove(document, { clientX: 300 });
    expect(sidebar.style.width).toBe('300px');
    fireEvent.mouseUp(document);
    // After mouseUp, further moves should not resize
    fireEvent.mouseMove(document, { clientX: 400 });
    expect(sidebar.style.width).toBe('300px');
  });

  it('clamps sidebar width to min/max', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const handle = document.querySelector('.sidebar-resize-handle') as HTMLElement;
    const sidebar = document.querySelector('.lists-pane') as HTMLElement;
    Object.defineProperty(sidebar, 'offsetWidth', { value: 240 });
    fireEvent.mouseDown(handle, { clientX: 240 });
    fireEvent.mouseMove(document, { clientX: 50 });
    expect(sidebar.style.width).toBe('160px');
    fireEvent.mouseMove(document, { clientX: 800 });
    expect(sidebar.style.width).toBe('480px');
    fireEvent.mouseUp(document);
  });
});

describe('Checkbox interactions', () => {
  beforeEach(() => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
  });

  it('clicking checkbox toggles task completion', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.click(workItem!);
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    const checkbox = screen.getByLabelText('mark Task 1 as complete');
    fireEvent.click(checkbox);
    await waitFor(() => expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('t1'));
  });

  it('clicking checkbox does not select the task row', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.click(workItem!);
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    const checkbox = screen.getByLabelText('mark Task 2 as complete');
    fireEvent.click(checkbox);
    // Task 2 row should not become selected (click was on checkbox, not row)
    const task2 = screen.getByText('Task 2', { selector: '.task-content' }).closest('li');
    expect(task2?.classList.contains('selected')).toBe(false);
  });

  it('clicking a smart list selects it', async () => {
    render(<App />);
    const sidebar = document.querySelector('.lists-pane')!;
    await waitFor(() => expect(sidebar.querySelector('.item-name')?.textContent).toBe('Inbox'));
    // Wait a bit for the app to fully initialize
    await new Promise(r => setTimeout(r, 100));
    const completedItem = Array.from(sidebar.querySelectorAll('li')).find(li => li.textContent?.includes('Completed'))!;
    fireEvent.click(completedItem);
    await waitFor(() => expect(completedItem.classList.contains('selected')).toBe(true), { timeout: 2000 });
  });

  it('completed view shows origin list name for each task', async () => {
    setupMockApi({
      tasksGetCompleted: () => Promise.resolve([
        { id: 'c1', list_id: '2', title: 'Done task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
        { id: 'c2', list_id: null, title: 'Inbox task', status: 'COMPLETED', created_timestamp: 0, completed_timestamp: 1, due_date: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
      ]),
    });
    render(<App />);
    // Navigate to Completed (index 4) using keyboard
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByText('Done task', { selector: '.task-content' })).toBeDefined());
    const origins = document.querySelectorAll('.task-origin');
    expect(origins.length).toBe(2);
    expect(origins[0].textContent).toBe('Work');
    expect(origins[1].textContent).toBe('Inbox');
  });

  it('clicking a folder selects it', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }),
      foldersGetAll: () => Promise.resolve([{ id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 }]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    const folderItem = screen.getByText('Projects').closest('li');
    fireEvent.click(folderItem!);
    await waitFor(() => expect(folderItem?.classList.contains('selected')).toBe(true));
  });
});

describe('Context menu', () => {
  beforeEach(() => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
  });

  it('right-clicking a task shows context menu', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.click(workItem!);
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li');
    fireEvent.contextMenu(task1!, { clientX: 100, clientY: 100 });
    await waitFor(() => expect(document.querySelector('.context-menu')).toBeDefined());
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Mark Complete')).toBeDefined();
    expect(screen.getByText('Move to...')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('right-clicking a list shows context menu', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    const workItem = screen.getByText('Work').closest('li');
    fireEvent.contextMenu(workItem!, { clientX: 100, clientY: 100 });
    await waitFor(() => expect(document.querySelector('.context-menu')).toBeDefined());
    expect(screen.getByText('Rename')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('context menu does not appear in hardcore mode', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }) });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    // Navigate to tasks via keyboard
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li');
    fireEvent.contextMenu(task1!, { clientX: 100, clientY: 100 });
    expect(document.querySelector('.context-menu')).toBeNull();
  });
});
