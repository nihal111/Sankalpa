import { waitFor, fireEvent, screen } from '@testing-library/react';
import { vi, expect } from 'vitest';
import type { Folder, List, Task } from '../shared/types';

export const mockFolders: Folder[] = [];

export const mockLists: List[] = [
  { id: '1', folder_id: null, name: 'Inbox', sort_key: 1, created_at: 0, updated_at: 0 },
  { id: '2', folder_id: null, name: 'Work', sort_key: 2, created_at: 0, updated_at: 0 },
];

export const mockTasks: Task[] = [
  { id: 't1', list_id: '1', title: 'Task 1', sort_key: 1, created_at: 0, updated_at: 0 },
  { id: 't2', list_id: '1', title: 'Task 2', sort_key: 2, created_at: 0, updated_at: 0 },
];

export function setupMockApi(overrides: Record<string, unknown> = {}): void {
  const defaultMocks = {
    onQuickAdd: vi.fn().mockReturnValue(() => {}),
    foldersGetAll: vi.fn().mockResolvedValue(mockFolders),
    foldersToggleExpanded: vi.fn().mockResolvedValue(undefined),
    foldersUpdate: vi.fn().mockResolvedValue(undefined),
    listsGetAll: vi.fn().mockResolvedValue(mockLists),
    listsGetTaskCount: vi.fn().mockResolvedValue(2),
    listsCreate: vi.fn().mockResolvedValue({ id: 'new', folder_id: null, name: '', sort_key: 3, created_at: 0, updated_at: 0 }),
    tasksGetInbox: vi.fn().mockResolvedValue([]),
    tasksGetInboxCount: vi.fn().mockResolvedValue(0),
    tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
    tasksCreate: vi.fn().mockResolvedValue({ id: 'new', list_id: '1', title: '', sort_key: 3, created_at: 0, updated_at: 0 }),
    listsUpdate: vi.fn().mockResolvedValue(undefined),
    tasksUpdate: vi.fn().mockResolvedValue(undefined),
    listsReorder: vi.fn().mockResolvedValue(undefined),
    tasksReorder: vi.fn().mockResolvedValue(undefined),
    tasksMove: vi.fn().mockResolvedValue(undefined),
    tasksDelete: vi.fn().mockResolvedValue(undefined),
    settingsGetAll: vi.fn().mockResolvedValue({}),
    settingsSet: vi.fn().mockResolvedValue(undefined),
  };
  // Wrap any non-spy overrides with vi.fn()
  const wrappedOverrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'function' && !('mock' in value)) {
      wrappedOverrides[key] = vi.fn().mockImplementation(value as (...args: unknown[]) => unknown);
    } else {
      wrappedOverrides[key] = value;
    }
  }
  window.api = { ...defaultMocks, ...wrappedOverrides } as unknown as typeof window.api;
}

export async function navigateToUserList(): Promise<void> {
  await waitFor(() => expect(document.querySelectorAll('.lists-pane .item.list').length).toBeGreaterThan(0));
  for (let i = 0; i < 5; i++) {
    fireEvent.keyDown(window, { key: 'ArrowDown' });
  }
  await waitFor(() => expect(screen.getByText('Task 1')).toBeDefined());
}

export async function navigateToTasksPane(): Promise<void> {
  await navigateToUserList();
  fireEvent.keyDown(window, { key: 'Tab' });
}
