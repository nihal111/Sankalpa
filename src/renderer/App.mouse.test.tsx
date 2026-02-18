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
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
    // Click second task
    const task2 = screen.getByText('Task 2').closest('li');
    fireEvent.click(task2!);
    await waitFor(() => expect(task2?.classList.contains('selected')).toBe(true));
    expect(document.querySelector('.tasks-pane')?.classList.contains('focused')).toBe(true);
  });

  it('clicking folder icon toggles expand/collapse', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }),
      foldersGetAll: () => Promise.resolve([{ id: 'f1', name: 'Folder', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 }]),
      listsGetAll: () => Promise.resolve([{ id: '1', folder_id: 'f1', name: 'Nested List', sort_key: 1, created_at: 0, updated_at: 0 }]),
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
    fireEvent.keyDown(window, { key: 'Tab' });
    await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
    const task1 = screen.getByText('Task 1').closest('li');
    const task2 = screen.getByText('Task 2').closest('li');
    expect(task1?.classList.contains('selected')).toBe(true);
    fireEvent.click(task2!);
    // Should still be on Task 1
    expect(task1?.classList.contains('selected')).toBe(true);
  });

  it('clicking folder icon does nothing in hardcore mode', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }),
      foldersGetAll: () => Promise.resolve([{ id: 'f1', name: 'Folder', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 }]),
      listsGetAll: () => Promise.resolve([{ id: '1', folder_id: 'f1', name: 'Nested', sort_key: 1, created_at: 0, updated_at: 0 }]),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Folder')).toBeDefined());
    const folderIcon = screen.getByText('Folder').closest('li')?.querySelector('.item-icon');
    fireEvent.click(folderIcon!);
    expect(window.api.foldersToggleExpanded).not.toHaveBeenCalled();
  });
});
