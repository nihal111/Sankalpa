import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi } from './test-utils';

function setupWithTasks(): void {
  const tasks = [
    { id: 't1', list_id: '2', title: 'Task 1', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
    { id: 't2', list_id: '2', title: 'Task 2', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
    { id: 't3', list_id: '2', title: 'Task 3', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 3, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
  ];
  setupMockApi({
    settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }),
    tasksGetByList: () => Promise.resolve(tasks),
    calcSortKey: (_b: number | null, _a: number | null) => Promise.resolve(1.5),
  });
}

async function navigateToTasks(): Promise<void> {
  await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
  fireEvent.click(screen.getByText('Work').closest('li')!);
  await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
}

function getSidebarListItem(name: string): HTMLElement {
  const sidebar = document.querySelector('.lists-pane')!;
  return Array.from(sidebar.querySelectorAll('li')).find(li => li.textContent?.includes(name))!;
}

describe('Drag-to-reorder tasks', () => {
  beforeEach(() => setupWithTasks());

  it('task items are draggable', async () => {
    render(<App />);
    await navigateToTasks();
    const item = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;
    expect(item.getAttribute('draggable')).toBe('true');
  });

  it('task items are not draggable in hardcore mode', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }),
      calcSortKey: () => Promise.resolve(1.5),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    // Navigate via keyboard since clicks are disabled
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());
    const item = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;
    expect(item.getAttribute('draggable')).toBe('false');
  });

  it('shows drop indicator on dragover', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;
    const task2 = screen.getByText('Task 2', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });
    // Simulate dragover on task2 bottom half
    Object.defineProperty(task2, 'getBoundingClientRect', {
      value: () => ({ top: 100, height: 40, bottom: 140, left: 0, right: 200, width: 200 }),
    });
    fireEvent.dragOver(task2, { clientY: 130, dataTransfer: { dropEffect: '' } });

    await waitFor(() => expect(task2.classList.contains('drag-over-after')).toBe(true));
  });

  it('clears indicator on dragleave', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;
    const task2 = screen.getByText('Task 2', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });
    Object.defineProperty(task2, 'getBoundingClientRect', {
      value: () => ({ top: 100, height: 40, bottom: 140, left: 0, right: 200, width: 200 }),
    });
    fireEvent.dragOver(task2, { clientY: 130, dataTransfer: { dropEffect: '' } });
    await waitFor(() => expect(task2.classList.contains('drag-over-after')).toBe(true));

    fireEvent.dragLeave(task2);
    await waitFor(() => expect(task2.classList.contains('drag-over-after')).toBe(false));
  });

  it('calls tasksReorder on drop', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;
    const task3 = screen.getByText('Task 3', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });
    Object.defineProperty(task3, 'getBoundingClientRect', {
      value: () => ({ top: 200, height: 40, bottom: 240, left: 0, right: 200, width: 200 }),
    });
    fireEvent.dragOver(task3, { clientY: 230, dataTransfer: { dropEffect: '' } });
    fireEvent.drop(task3, { dataTransfer: { getData: () => '0' } });

    await waitFor(() => expect(window.api.tasksReorder).toHaveBeenCalled());
  });

  it('clears state on dragend', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;
    const task2 = screen.getByText('Task 2', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });
    Object.defineProperty(task2, 'getBoundingClientRect', {
      value: () => ({ top: 100, height: 40, bottom: 140, left: 0, right: 200, width: 200 }),
    });
    fireEvent.dragOver(task2, { clientY: 130, dataTransfer: { dropEffect: '' } });
    await waitFor(() => expect(task2.classList.contains('drag-over-after')).toBe(true));

    fireEvent.dragEnd(task1);
    await waitFor(() => expect(task2.classList.contains('drag-over-after')).toBe(false));
  });
});

describe('Drag-to-move to sidebar list', () => {
  beforeEach(() => setupWithTasks());

  it('highlights sidebar list on dragover from task', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });

    const workItem = getSidebarListItem('Work');
    fireEvent.dragOver(workItem, { dataTransfer: { dropEffect: '' } });

    await waitFor(() => expect(workItem.classList.contains('drag-drop-target')).toBe(true));
  });

  it('clears sidebar highlight on dragleave', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });

    const workItem = getSidebarListItem('Work');
    fireEvent.dragOver(workItem, { dataTransfer: { dropEffect: '' } });
    await waitFor(() => expect(workItem.classList.contains('drag-drop-target')).toBe(true));

    fireEvent.dragLeave(workItem);
    await waitFor(() => expect(workItem.classList.contains('drag-drop-target')).toBe(false));
  });

  it('calls tasksMove on drop to sidebar list', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });

    const workItem = getSidebarListItem('Work');
    fireEvent.dragOver(workItem, { dataTransfer: { dropEffect: '' } });
    fireEvent.drop(workItem, { dataTransfer: { getData: () => '0' } });

    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '2'));
  });

  it('undo reverses drag-to-move', async () => {
    render(<App />);
    await navigateToTasks();
    const task1 = screen.getByText('Task 1', { selector: '.task-content' }).closest('li')!;

    fireEvent.dragStart(task1, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });
    const workItem = getSidebarListItem('Work');
    fireEvent.dragOver(workItem, { dataTransfer: { dropEffect: '' } });
    fireEvent.drop(workItem, { dataTransfer: { getData: () => '0' } });
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalled());

    (window.api.tasksMove as ReturnType<typeof import('vitest').vi.fn>).mockClear();
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    // Undo should move task back to original list
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '2'));
  });
});

describe('Drag in folder view', () => {
  it('drag reorder works in folder view', async () => {
    const folders = [{ id: 'f1', name: 'Folder', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 }];
    const lists = [
      { id: 'l1', folder_id: 'f1', name: 'List 1', notes: null, sort_key: 1, created_at: 0, updated_at: 0 },
    ];
    const tasks = [
      { id: 't1', list_id: 'l1', title: 'Task 1', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
      { id: 't2', list_id: 'l1', title: 'Task 2', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, notes: null, sort_key: 2, created_at: 0, updated_at: 0, deleted_at: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }),
      foldersGetAll: () => Promise.resolve(folders),
      listsGetAll: () => Promise.resolve(lists),
      tasksGetByList: () => Promise.resolve(tasks),
      calcSortKey: () => Promise.resolve(1.5),
    });
    render(<App />);
    // Navigate to folder via keyboard
    await waitFor(() => expect(screen.getByText('Folder')).toBeDefined());
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(document.querySelector('.tasks-pane.focused')).toBeDefined());
    await waitFor(() => expect(screen.getByText('Task 1', { selector: '.task-content' })).toBeDefined());

    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems.length).toBeGreaterThanOrEqual(2);
    
    // Find task items (skip header)
    const task1 = Array.from(taskItems).find(el => el.textContent?.includes('Task 1'));
    const task2 = Array.from(taskItems).find(el => el.textContent?.includes('Task 2'));
    expect(task1).toBeDefined();
    expect(task2).toBeDefined();

    fireEvent.dragStart(task1!, { dataTransfer: { setData: () => {}, effectAllowed: 'move' } });
    fireEvent.dragOver(task2!, { dataTransfer: { dropEffect: '' }, clientY: 100 });
    fireEvent.drop(task2!, { dataTransfer: { getData: () => '1' }, clientY: 100 });

    await waitFor(() => expect(window.api.tasksReorder).toHaveBeenCalled());
  });
});
