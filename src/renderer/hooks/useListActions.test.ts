import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListActions } from './useListActions';

describe('useListActions', () => {
  it('deleteList shows confirmation dialog', () => {
    const list = { id: '1', name: 'Test List', folder_id: null, created_at: new Date(), updated_at: new Date() };
    const sidebarItem = { type: 'list' as const, list };
    
    const { result } = renderHook(() => useListActions({
      selectedSidebarIndex: 0,
      sidebarItems: [sidebarItem],
      selectedSidebarItem: sidebarItem,
      taskCounts: { '1': 5 },
      setSelectedSidebarIndex: vi.fn(),
      setFocusedPane: vi.fn(),
      setEditMode: vi.fn(),
      setEditValue: vi.fn(),
      setFolders: vi.fn(),
      setLists: vi.fn(),
      flash: vi.fn(),
      undoPush: vi.fn(),
    }));

    act(() => {
      result.current.deleteList();
    });

    expect(result.current.listConfirmationDialog).not.toBeNull();
    expect(result.current.listConfirmationDialog?.title).toBe('Confirm list deletion');
  });
});
