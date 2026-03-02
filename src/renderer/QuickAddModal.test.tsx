import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QuickAddModal } from './QuickAddModal';
import type { List } from '../shared/types';

const mockLists: List[] = [
  { id: '1', folder_id: null, name: 'Work', notes: null, sort_key: 1, created_at: 0, updated_at: 0 },
  { id: '2', folder_id: null, name: 'Personal', notes: null, sort_key: 2, created_at: 0, updated_at: 0 },
];

describe('QuickAddModal', () => {
  let onSubmit: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
    onClose = vi.fn();
  });

  it('renders nothing when closed', () => {
    render(<QuickAddModal isOpen={false} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    expect(document.querySelector('.quick-add-modal')).toBeNull();
  });

  it('renders modal when open', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    expect(document.querySelector('.quick-add-modal')).not.toBeNull();
    expect(document.querySelector('.quick-add-title')).not.toBeNull();
  });

  it('calls onClose when clicking overlay', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(document.querySelector('.modal-overlay')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking modal content', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(document.querySelector('.quick-add-modal')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.keyDown(document.querySelector('.quick-add-modal')!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Tab from title opens list dropdown', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const titleInput = document.querySelector('.quick-add-title') as HTMLInputElement;
    fireEvent.keyDown(titleInput, { key: 'Tab' });
    const dropdownInput = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    expect(dropdownInput?.placeholder).toBe('Search lists...');
  });

  it('submits with Cmd+Enter when title is filled', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const input = document.querySelector('.quick-add-title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test task' } });
    fireEvent.keyDown(document.querySelector('.quick-add-modal')!, { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Test task',
      listId: null,
      dueDate: null,
      duration: null,
      notes: '',
    });
  });

  it('does not submit with empty title', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.keyDown(document.querySelector('.quick-add-modal')!, { key: 'Enter', metaKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('opens list dropdown when clicking Inbox button', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const inboxBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Inbox'));
    fireEvent.click(inboxBtn!);
    expect(document.querySelector('.quick-add-dropdown')).not.toBeNull();
    expect(document.querySelector('.quick-add-dropdown-item')?.textContent).toBe('Inbox');
  });

  it('selects list from dropdown', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const inboxBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Inbox'));
    fireEvent.click(inboxBtn!);
    const workItem = Array.from(document.querySelectorAll('.quick-add-dropdown-item')).find(i => i.textContent === 'Work');
    fireEvent.click(workItem!);
    await waitFor(() => {
      const btn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Work'));
      expect(btn).not.toBeNull();
    });
  });

  it('opens due date dropdown', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const dueBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Due date'));
    fireEvent.click(dueBtn!);
    expect(document.querySelector('.quick-add-dropdown')).not.toBeNull();
  });

  it('opens duration dropdown', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    expect(document.querySelector('.quick-add-dropdown')).not.toBeNull();
    expect(document.querySelector('.quick-add-dropdown-item')?.textContent).toBe('15 minutes');
  });

  it('selects duration from dropdown', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const item = document.querySelector('.quick-add-dropdown-item');
    fireEvent.click(item!);
    await waitFor(() => {
      const btn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('15m'));
      expect(btn).not.toBeNull();
    });
  });

  it('navigates dropdown with arrow keys', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input')!;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.querySelectorAll('.quick-add-dropdown-item')[1]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(document.querySelectorAll('.quick-add-dropdown-item')[0]?.classList.contains('selected')).toBe(true);
  });

  it('selects dropdown item with Enter', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input')!;
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown')).toBeNull());
  });

  it('closes dropdown with Escape', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.querySelector('.quick-add-dropdown')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('filters lists by query', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const inboxBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Inbox'));
    fireEvent.click(inboxBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'work' } });
    await waitFor(() => {
      const items = document.querySelectorAll('.quick-add-dropdown-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toBe('Work');
    });
  });

  it('parses custom duration input', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2h' } });
    await waitFor(() => {
      expect(document.querySelector('.quick-add-dropdown-item')?.textContent).toBe('2h');
    });
  });

  it('updates notes textarea', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const textarea = document.querySelector('.quick-add-notes') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Some notes' } });
    expect(textarea.value).toBe('Some notes');
  });

  it('submits with all fields filled', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    
    // Set title
    const titleInput = document.querySelector('.quick-add-title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'My task' } });
    
    // Set list
    const listBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Inbox'));
    fireEvent.click(listBtn!);
    const workItem = Array.from(document.querySelectorAll('.quick-add-dropdown-item')).find(i => i.textContent === 'Work');
    fireEvent.click(workItem!);
    
    // Set duration
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown')).toBeNull());
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    fireEvent.click(document.querySelector('.quick-add-dropdown-item')!);
    
    // Set notes
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown')).toBeNull());
    const textarea = document.querySelector('.quick-add-notes') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Task notes' } });
    
    // Submit
    fireEvent.click(document.querySelector('.quick-add-footer-btn.primary')!);
    
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'My task',
      listId: '1',
      dueDate: null,
      duration: 15,
      notes: 'Task notes',
    });
  });

  it('resets state when reopened', async () => {
    const { rerender } = render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    
    const titleInput = document.querySelector('.quick-add-title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Test' } });
    
    rerender(<QuickAddModal isOpen={false} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    rerender(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    
    await waitFor(() => {
      const input = document.querySelector('.quick-add-title') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  it('selects due date from dropdown', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const dueBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Due date'));
    fireEvent.click(dueBtn!);
    // Type something to get suggestions
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tomorrow' } });
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown-item')).not.toBeNull());
    const item = document.querySelector('.quick-add-dropdown-item');
    fireEvent.click(item!);
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown')).toBeNull());
  });

  it('selects list with Enter key', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const listBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Inbox'));
    fireEvent.click(listBtn!);
    const input = document.querySelector('.quick-add-dropdown-input')!;
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // Move to Work
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      const btn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Work'));
      expect(btn).not.toBeNull();
    });
  });

  it('selects due date with Enter key and advances to duration', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const dueBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Due date'));
    fireEvent.click(dueBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tomorrow' } });
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown-item')).not.toBeNull());
    fireEvent.keyDown(input, { key: 'Enter' });
    // Should advance to duration dropdown
    await waitFor(() => {
      const placeholder = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
      expect(placeholder?.placeholder).toBe('Set duration');
    });
  });

  it('toggles dropdown off when clicking same button', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    expect(document.querySelector('.quick-add-dropdown')).not.toBeNull();
    fireEvent.click(durBtn!);
    expect(document.querySelector('.quick-add-dropdown')).toBeNull();
  });

  it('Backspace clears due date when dropdown is open', async () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    // Set a due date first
    const dueBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Due date'));
    fireEvent.click(dueBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tomorrow' } });
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown-item')).not.toBeNull());
    fireEvent.keyDown(input, { key: 'Enter' });
    // Re-open due date dropdown
    fireEvent.click(dueBtn!);
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown-current')).not.toBeNull());
    // Backspace to clear
    const input2 = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input2, { key: 'Backspace' });
    await waitFor(() => expect(document.querySelector('.quick-add-dropdown-current')).toBeNull());
  });

  it('Backspace clears duration when dropdown is open', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    // Set duration first
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' }); // Select 15 min
    // Re-open
    fireEvent.click(durBtn!);
    expect(document.querySelector('.quick-add-dropdown-current')).not.toBeNull();
    // Backspace to clear
    const input2 = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input2, { key: 'Backspace' });
    expect(document.querySelector('.quick-add-dropdown-current')).toBeNull();
  });

  it('Backspace clears list selection when dropdown is open', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    // Select a list first
    const listBtn = document.querySelector('.quick-add-btn-list');
    fireEvent.click(listBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // Move to Work
    fireEvent.keyDown(input, { key: 'Enter' });
    // Re-open
    fireEvent.click(listBtn!);
    expect(document.querySelector('.quick-add-dropdown-current')).not.toBeNull();
    // Backspace to clear
    const input2 = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input2, { key: 'Backspace' });
    expect(document.querySelector('.quick-add-dropdown-current')).toBeNull();
  });

  it('Shift+Tab goes back from duration to due date', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    const newInput = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    expect(newInput?.placeholder).toBe('Set due date');
  });

  it('Shift+Tab goes back from due date to list', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const dueBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Due date'));
    fireEvent.click(dueBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    const newInput = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    expect(newInput?.placeholder).toBe('Search lists...');
  });

  it('Shift+Tab goes back from list to title', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const listBtn = document.querySelector('.quick-add-btn-list');
    fireEvent.click(listBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(document.querySelector('.quick-add-dropdown')).toBeNull();
  });

  it('Tab in duration with no selection closes dropdown and focuses title', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const durBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Duration'));
    fireEvent.click(durBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'xyz' } }); // no matches
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(document.querySelector('.quick-add-dropdown')).toBeNull();
  });

  it('Escape on modal closes it when no dropdown open', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const modal = document.querySelector('.quick-add-modal');
    fireEvent.keyDown(modal!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Escape on title input closes modal', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const titleInput = document.querySelector('.quick-add-title');
    fireEvent.keyDown(titleInput!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Tab in due date with no selection advances to duration', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const dueBtn = Array.from(document.querySelectorAll('.quick-add-btn')).find(b => b.textContent?.includes('Due date'));
    fireEvent.click(dueBtn!);
    const input = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'xyz' } }); // no matches
    fireEvent.keyDown(input, { key: 'Tab' });
    const newInput = document.querySelector('.quick-add-dropdown-input') as HTMLInputElement;
    expect(newInput?.placeholder).toBe('Set duration');
  });

  it('Escape on modal with dropdown open closes dropdown', () => {
    render(<QuickAddModal isOpen={true} lists={mockLists} onSubmit={onSubmit} onClose={onClose} />);
    const listBtn = document.querySelector('.quick-add-btn-list');
    fireEvent.click(listBtn!);
    const modal = document.querySelector('.quick-add-modal');
    fireEvent.keyDown(modal!, { key: 'Escape' });
    expect(document.querySelector('.quick-add-dropdown')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
