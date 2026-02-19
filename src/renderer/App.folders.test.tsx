import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import type { Folder, List } from '../shared/types';
import { setupMockApi } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App folders', () => {
  it('displays folders with expand/collapse icons', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeDefined();
    });
    const folderItem = document.querySelector('.item.folder');
    expect(folderItem?.querySelector('.item-icon svg')).toBeDefined();
  });

  it('right arrow expands collapsed folder', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      foldersToggleExpanded: vi.fn().mockImplementation(async () => {
        foldersWithData[0].is_expanded = 1;
      }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const folderItem = document.querySelector('.item.folder');
    expect(folderItem?.querySelector('.item-icon svg')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(window.api.foldersToggleExpanded).toHaveBeenCalledWith('f1');
    });
  });

  it('left arrow collapses expanded folder', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      foldersToggleExpanded: vi.fn().mockImplementation(async () => {
        foldersWithData[0].is_expanded = 0;
      }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const folderItem = document.querySelector('.item.folder');
    expect(folderItem?.querySelector('.item-icon svg')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(window.api.foldersToggleExpanded).toHaveBeenCalledWith('f1');
    });
  });

  it('shows nested list with indentation', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    const listsWithFolder: List[] = [
      { id: '1', folder_id: 'f1', name: 'Inbox', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 1, created_at: 0, updated_at: 0 },
      { id: '2', folder_id: null, name: 'Work', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 2, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsGetAll: vi.fn().mockResolvedValue(listsWithFolder),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    const nestedList = document.querySelector('.item.list.nested');
    expect(nestedList).toBeDefined();
  });

  it('shows task count badge on lists', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    await waitFor(() => {
      const badges = document.querySelectorAll('.item-badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('enters edit mode on folder with Enter', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => {
      const input = document.querySelector('.lists-pane input');
      expect(input).toBeDefined();
    });
  });

  it('commits folder edit on Enter', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      foldersUpdate: vi.fn().mockResolvedValue(undefined),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    const input = document.querySelector('.lists-pane input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Folder Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.foldersUpdate).toHaveBeenCalledWith('f1', 'New Folder Name'));
  });

  it('right arrow on expanded folder moves to first child', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    const listsWithFolder: List[] = [
      { id: '1', folder_id: 'f1', name: 'Inbox', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 1, created_at: 0, updated_at: 0 },
      { id: '2', folder_id: null, name: 'Work', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 2, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsGetAll: vi.fn().mockResolvedValue(listsWithFolder),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const folderItem = document.querySelector('.item.folder');
    expect(folderItem?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      const nestedList = document.querySelector('.item.list.nested');
      expect(nestedList?.classList.contains('selected')).toBe(true);
    });
  });

  it('left arrow on nested list moves to parent folder', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    const listsWithFolder: List[] = [
      { id: '1', folder_id: 'f1', name: 'Inbox', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 1, created_at: 0, updated_at: 0 },
      { id: '2', folder_id: null, name: 'Work', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 2, created_at: 0, updated_at: 0 },
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
    const nestedList = document.querySelector('.item.list.nested');
    expect(nestedList?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => {
      const folderItem = document.querySelector('.item.folder');
      expect(folderItem?.classList.contains('selected')).toBe(true);
    });
  });

  it('creates list inside collapsed folder', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsCreate: vi.fn().mockResolvedValue({ id: 'new', folder_id: 'f1', name: '', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 1, created_at: 0, updated_at: 0 }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const folderItem = document.querySelector('.item.folder');
    expect(folderItem?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true });
    await waitFor(() => {
      expect(window.api.listsCreate).toHaveBeenCalledWith(expect.any(String), '', 'f1');
    });
  });

  it('creates list inside expanded folder', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
      listsCreate: vi.fn().mockResolvedValue({ id: 'new', folder_id: 'f1', name: '', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, sort_key: 1, created_at: 0, updated_at: 0 }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const folderItem = document.querySelector('.item.folder');
    expect(folderItem?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true });
    await waitFor(() => {
      expect(window.api.listsCreate).toHaveBeenCalledWith(expect.any(String), '', 'f1');
    });
  });

  it('cancels folder edit on blur', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    const input = document.querySelector('.lists-pane input') as HTMLInputElement;
    fireEvent.blur(input);
    expect(document.querySelector('.lists-pane input')).toBeNull();
  });

  it('left arrow on collapsed folder does nothing', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 0, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    // Should stay on the folder
    expect(screen.getByText('Projects').closest('li')?.classList.contains('selected')).toBe(true);
    expect(window.api.foldersToggleExpanded).not.toHaveBeenCalled();
  });

  it('left arrow on expanded folder collapses it', async () => {
    const foldersWithData: Folder[] = [
      { id: 'f1', name: 'Projects', sort_key: 1, is_expanded: 1, created_at: 0, updated_at: 0 },
    ];
    setupMockApi({
      foldersGetAll: vi.fn().mockResolvedValue(foldersWithData),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Projects')).toBeDefined());
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => expect(window.api.foldersToggleExpanded).toHaveBeenCalledWith('f1'));
  });
});
