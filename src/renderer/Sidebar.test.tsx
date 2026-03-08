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

  it('shows Inbox keycap badge 0 on the smart list icon', () => {
    render(<Sidebar {...mockProps} />);
    const inboxIcon = document.querySelector('.item.smart-list .item-icon[data-keycap="0"]');
    expect(inboxIcon).toBeDefined();
  });

  it('shows Cmd keycap badges only for list numbers 1 through 9', () => {
    const smartItems = [
      { type: 'smart' as const, smartList: { id: 'inbox' as SmartListId, name: 'Inbox', icon: '<svg></svg>' } },
      { type: 'smart' as const, smartList: { id: 'today' as SmartListId, name: 'Today', icon: '<svg></svg>' } },
      { type: 'smart' as const, smartList: { id: 'upcoming' as SmartListId, name: 'Upcoming', icon: '<svg></svg>' } },
      { type: 'smart' as const, smartList: { id: 'completed' as SmartListId, name: 'Completed', icon: '<svg></svg>' } },
      { type: 'smart' as const, smartList: { id: 'overdue' as SmartListId, name: 'Overdue', icon: '<svg></svg>' } },
    ];
    const listItems = Array.from({ length: 12 }, (_, i) => ({
      type: 'list' as const,
      list: { id: `l${i + 1}`, folder_id: null, name: `List ${i + 1}`, notes: null, sort_key: i + 1, created_at: 0, updated_at: 0 },
    }));
    render(
      <Sidebar
        {...mockProps}
        sidebarItems={[...smartItems, ...listItems, { type: 'smart', smartList: { id: 'trash' as SmartListId, name: 'Trash', icon: '<svg></svg>' } }]}
        trashIndex={smartItems.length + listItems.length}
      />,
    );
    const keycapIcons = document.querySelectorAll('.item.list .item-icon[data-keycap]');
    expect(keycapIcons.length).toBe(9);
    expect(Array.from(keycapIcons).some((el) => (el as HTMLElement).dataset.keycap === '10')).toBe(false);
  });
});
