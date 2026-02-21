import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToTasksPane, mockTasks } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App notes', () => {
  it('N key opens notes editor and Escape cancels', async () => {
    render(<App />);
    await navigateToTasksPane();
    expect(document.querySelector('.notes-textarea')).toBeNull();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-textarea')).toBeDefined());
    expect(document.querySelector('.notes-textarea')).not.toBeNull();
    fireEvent.keyDown(document.querySelector('.notes-textarea')!, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.notes-textarea')).toBeNull());
  });

  it('notes editor commits on blur', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-textarea')).not.toBeNull());
    const textarea = document.querySelector('.notes-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello world' } });
    fireEvent.blur(textarea);
    await waitFor(() => expect(window.api.tasksUpdateNotes).toHaveBeenCalledWith('t1', 'hello world'));
  });

  it('renders markdown when task has notes', async () => {
    const tasksWithNotes = mockTasks.map((t, i) => i === 0 ? { ...t, notes: '**bold text**' } : t);
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(tasksWithNotes) });
    render(<App />);
    await navigateToTasksPane();
    await waitFor(() => expect(document.querySelector('.notes-rendered')).not.toBeNull());
    expect(document.querySelector('.notes-rendered strong')?.textContent).toBe('bold text');
  });

  it('clicking notes section opens editor', async () => {
    render(<App />);
    await navigateToTasksPane();
    const notesSection = document.querySelector('.detail-notes-section');
    fireEvent.click(notesSection!);
    await waitFor(() => expect(document.querySelector('.notes-textarea')).not.toBeNull());
  });
});
