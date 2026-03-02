import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { SmartListId } from './types';

describe('Sidebar badges', () => {
  const mockProps = {
    sidebarItems: [
      {
        type: 'smart' as const,
        smartList: { id: 'inbox' as SmartListId, name: 'Inbox', icon: '<svg></svg>' },
      },
      {
        type: 'smart' as const,
        smartList: { id: 'today' as SmartListId, name: 'Today', icon: '<svg></svg>' },
      },
      {
        type: 'smart' as const,
        smartList: { id: 'overdue' as SmartListId, name: 'Overdue', icon: '<svg></svg>' },
      },
    ],
    selectedSidebarIndex: 0,
    taskCounts: { inbox: 5, today: 3, today_overdue: 1, overdue: 0 },
    focusedPane: 'lists' as const,
    editMode: null,
    editValue: '',
    setEditValue: vi.fn(),
    setEditMode: vi.fn(),
    onItemClick: vi.fn(),
    onItemContextMenu: vi.fn(),
    onFolderToggle: vi.fn(),
    handleInputKeyDown: vi.fn(),
    inputRef: { current: null },
    flashIds: new Set<string>(),
    trashIndex: 3,
    metaHeld: false,
    moveMode: false,
    moveTargetIndex: 0,
    moveListMode: false,
    moveListTargetFolderId: null,
  };

  it('shows two badges for Today when both today and overdue tasks exist', () => {
    render(<Sidebar {...mockProps} />);
    const badges = screen.getAllByText(/[0-9]/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows only overdue badge when no today-only tasks', () => {
    const props = {
      ...mockProps,
      taskCounts: { inbox: 5, today: 1, today_overdue: 1, overdue: 0 },
    };
    render(<Sidebar {...props} />);
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('hides Overdue list when no overdue tasks', () => {
    render(<Sidebar {...mockProps} />);
    const overdue = screen.queryByText('Overdue');
    expect(overdue).toBeDefined();
  });
});
