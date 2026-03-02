import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi, navigateToTasksPane, mockTasks } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App notes', () => {
  it('N key opens notes modal and Escape cancels', async () => {
    render(<App />);
    await navigateToTasksPane();
    expect(document.querySelector('.notes-modal')).toBeNull();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-modal')).not.toBeNull());
    fireEvent.keyDown(document.querySelector('.notes-modal')!, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.notes-modal')).toBeNull());
  });

  it('renders markdown when task has notes', async () => {
    const tasksWithNotes = mockTasks.map((t, i) => i === 0 ? { ...t, notes: '**bold text**' } : t);
    setupMockApi({ tasksGetByList: vi.fn().mockResolvedValue(tasksWithNotes) });
    render(<App />);
    await navigateToTasksPane();
    await waitFor(() => expect(document.querySelector('.notes-rendered')).not.toBeNull());
    expect(document.querySelector('.notes-rendered strong')?.textContent).toBe('bold text');
  });

  it('clicking notes section opens modal', async () => {
    render(<App />);
    await navigateToTasksPane();
    const notesSection = document.querySelector('.detail-notes-section');
    fireEvent.click(notesSection!);
    await waitFor(() => expect(document.querySelector('.notes-modal')).not.toBeNull());
  });

  it('Cmd+Enter saves notes', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-modal-textarea')).not.toBeNull());
    const textarea = document.querySelector('.notes-modal-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'saved via cmd+enter' } });
    fireEvent.keyDown(document.querySelector('.notes-modal')!, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(window.api.tasksUpdateNotes).toHaveBeenCalledWith('t1', 'saved via cmd+enter'));
    expect(document.querySelector('.notes-modal')).toBeNull();
  });

  it('edit/preview toggle works', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-modal')).not.toBeNull());
    const textarea = document.querySelector('.notes-modal-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '**bold**' } });
    // Click preview tab
    const previewTab = document.querySelector('.notes-modal-tab:nth-child(2)');
    fireEvent.click(previewTab!);
    await waitFor(() => expect(document.querySelector('.notes-modal-preview')).not.toBeNull());
    expect(document.querySelector('.notes-modal-preview strong')?.textContent).toBe('bold');
    // Click edit tab to go back
    const editTab = document.querySelector('.notes-modal-tab:nth-child(1)');
    fireEvent.click(editTab!);
    await waitFor(() => expect(document.querySelector('.notes-modal-textarea')).not.toBeNull());
  });

  it('Cmd+P toggles edit/preview mode', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-modal-textarea')).not.toBeNull());
    fireEvent.keyDown(document.querySelector('.notes-modal')!, { key: 'p', metaKey: true });
    await waitFor(() => expect(document.querySelector('.notes-modal-preview')).not.toBeNull());
    fireEvent.keyDown(document.querySelector('.notes-modal')!, { key: 'p', metaKey: true });
    await waitFor(() => expect(document.querySelector('.notes-modal-textarea')).not.toBeNull());
  });

  it('clicking overlay closes modal', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-modal')).not.toBeNull());
    fireEvent.click(document.querySelector('.modal-overlay')!);
    await waitFor(() => expect(document.querySelector('.notes-modal')).toBeNull());
  });

  it('clicking modal content does not close modal', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'n' });
    await waitFor(() => expect(document.querySelector('.notes-modal')).not.toBeNull());
    fireEvent.click(document.querySelector('.notes-modal')!);
    expect(document.querySelector('.notes-modal')).not.toBeNull();
  });
});
