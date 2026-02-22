import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import type { Task } from '../shared/types';
import { setupMockApi, navigateToUserList, navigateToTasksPane, mockTasks } from './test-utils';

const undo = () => fireEvent.keyDown(window, { key: 'z', metaKey: true });
const redo = () => fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });

async function renameTask(value: string): Promise<void> {
  fireEvent.keyDown(window, { key: 'e' });
  await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeDefined());
  const input = document.querySelector('.tasks-pane .edit-input') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeNull());
}

describe('App undo/redo', () => {
  it('undo reverts task rename, redo re-applies it', async () => {
    const tasksAfter = mockTasks.map((t) => t.id === 't1' ? { ...t, title: 'Renamed' } : t);
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)    // initial load
      .mockResolvedValueOnce(tasksAfter)   // after rename commit
      .mockResolvedValueOnce(mockTasks)    // after undo
      .mockResolvedValueOnce(tasksAfter);  // after redo
    setupMockApi({ tasksGetByList });
    render(<App />);
    await navigateToTasksPane();

    await renameTask('Renamed');
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Renamed'));

    undo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Task 1'));

    redo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Renamed'));
    await waitFor(() => expect(screen.getByText('Renamed', { selector: '.task-content' })).toBeDefined());
  });

  it('undo delete restores task, redo re-deletes it', async () => {
    const tasksAfterDelete: Task[] = [mockTasks[1]];
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)        // initial load
      .mockResolvedValueOnce(tasksAfterDelete)  // after delete
      .mockResolvedValueOnce(mockTasks)         // after undo (restore)
      .mockResolvedValueOnce(tasksAfterDelete); // after redo (re-delete)
    setupMockApi({ tasksGetByList });
    render(<App />);
    await navigateToTasksPane();

    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('t1'));

    undo();
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('t1'));

    redo();
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledTimes(2));
  });

  it('create + rename: two undos then two redos replays full sequence', async () => {
    const newTask: Task = { id: 'new', list_id: '1', title: '', status: 'PENDING', created_timestamp: 100, completed_timestamp: null, due_date: null, sort_key: 3, created_at: 100, updated_at: 100, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    const namedTask: Task = { ...newTask, title: 'Fresh' };
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)                    // initial load
      .mockResolvedValueOnce([...mockTasks, newTask])      // after create
      .mockResolvedValueOnce([...mockTasks, namedTask])    // after rename commit
      .mockResolvedValueOnce([...mockTasks, newTask])      // after undo rename
      .mockResolvedValueOnce(mockTasks)                    // after undo create
      .mockResolvedValueOnce([...mockTasks, newTask])      // after redo create
      .mockResolvedValueOnce([...mockTasks, namedTask]);   // after redo rename
    setupMockApi({
      tasksCreate: vi.fn().mockResolvedValue(newTask),
      tasksGetByList,
    });
    render(<App />);
    await navigateToTasksPane();

    // Create task → enters edit mode
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => expect(window.api.tasksCreate).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeDefined());
    const input = document.querySelector('.tasks-pane .edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Fresh' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('new', 'Fresh'));
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeNull());

    // Undo rename → empty title
    undo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('new', ''));

    // Undo create → task deleted
    undo();
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('new'));

    // Redo create → task restored
    redo();
    await waitFor(() => expect(window.api.tasksRestore).toHaveBeenCalledWith(
      'new', '1', '', 'PENDING', 100, null, 3, 100, 100,
    ));

    // Redo rename → task named again
    redo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('new', 'Fresh'));
  });

  it('five renames, full undo, full redo', async () => {
    const tasksGetByList = vi.fn().mockResolvedValue(mockTasks);
    setupMockApi({ tasksGetByList });
    render(<App />);
    await navigateToTasksPane();

    // Perform 5 renames: Task 1 → A → B → C → D → E
    const names = ['A', 'B', 'C', 'D', 'E'];
    for (const name of names) {
      await renameTask(name);
      await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', name));
    }

    // Undo all 5: E→D, D→C, C→B, B→A, A→Task 1
    const undoExpected = ['D', 'C', 'B', 'A', 'Task 1'];
    for (const expected of undoExpected) {
      undo();
      await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', expected));
    }

    // Redo all 5: Task 1→A, A→B, B→C, C→D, D→E
    for (const name of names) {
      redo();
      await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', name));
    }

    // Extra redo does nothing
    const callsBefore = (window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls.length;
    redo();
    await new Promise((r) => setTimeout(r, 50));
    expect((window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore);
  });

  it('new action after undo clears redo stack', async () => {
    const tasksA = mockTasks.map((t) => t.id === 't1' ? { ...t, title: 'A' } : t);
    const tasksB = mockTasks.map((t) => t.id === 't1' ? { ...t, title: 'B' } : t);
    const tasksC = mockTasks.map((t) => t.id === 't1' ? { ...t, title: 'C' } : t);
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks) // initial load
      .mockResolvedValueOnce(tasksA)    // after rename to A
      .mockResolvedValueOnce(tasksB)    // after rename to B
      .mockResolvedValueOnce(tasksA)    // after undo B→A
      .mockResolvedValueOnce(tasksC)    // after rename to C
      .mockResolvedValueOnce(tasksC)    // redo no-op (won't reload, but just in case)
      .mockResolvedValueOnce(tasksA);   // after undo C→A
    setupMockApi({ tasksGetByList });
    render(<App />);
    await navigateToTasksPane();

    // Rename to A, then B
    await renameTask('A');
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'A'));
    await renameTask('B');
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'B'));

    // Undo B → A
    undo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'A'));
    await waitFor(() => expect(screen.getByText('A', { selector: '.task-content' })).toBeDefined());

    // Instead of redo, do a NEW action: rename to C — this should clear redo stack
    await renameTask('C');
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'C'));

    // Redo should do nothing — the B rename was discarded
    const callsBefore = (window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls.length;
    redo();
    await new Promise((r) => setTimeout(r, 50));
    expect((window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore);

    // Undo should go C → A (not C → B)
    undo();
    await waitFor(() => {
      const calls = (window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[calls.length - 1]).toEqual(['t1', 'A']);
    });
  });

  it('undo reorder then redo re-applies it', async () => {
    const t1 = mockTasks[0];
    const t2 = mockTasks[1];
    const tasksGetByList = vi.fn().mockResolvedValue(mockTasks);
    setupMockApi({ tasksGetByList });
    render(<App />);
    await navigateToTasksPane();

    // Reorder: move first task down (swap sort keys)
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });
    await waitFor(() => expect(window.api.tasksReorder).toHaveBeenCalledWith(t1.id, t2.sort_key));
    expect(window.api.tasksReorder).toHaveBeenCalledWith(t2.id, t1.sort_key);

    // Undo reorder — restores original sort keys
    const reorderMock = window.api.tasksReorder as ReturnType<typeof vi.fn>;
    const callsAfterReorder = reorderMock.mock.calls.length;
    undo();
    await waitFor(() => expect(reorderMock.mock.calls.length).toBeGreaterThanOrEqual(callsAfterReorder + 2));
    expect(reorderMock).toHaveBeenCalledWith(t1.id, t1.sort_key);
    expect(reorderMock).toHaveBeenCalledWith(t2.id, t2.sort_key);

    // Redo reorder — re-swaps
    const callsAfterUndo = reorderMock.mock.calls.length;
    redo();
    await waitFor(() => expect(reorderMock.mock.calls.length).toBeGreaterThanOrEqual(callsAfterUndo + 2));
    const lastTwo = reorderMock.mock.calls.slice(-2);
    expect(lastTwo).toContainEqual([t1.id, t2.sort_key]);
    expect(lastTwo).toContainEqual([t2.id, t1.sort_key]);
  });

  it('interleaved create, rename, delete: undo all then redo all', async () => {
    const newTask: Task = { id: 'new', list_id: '1', title: '', status: 'PENDING', created_timestamp: 50, completed_timestamp: null, due_date: null, sort_key: 3, created_at: 50, updated_at: 50, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 };
    const tasksWithNew = [...mockTasks, newTask];
    const tasksGetByList = vi.fn()
      .mockResolvedValueOnce(mockTasks)    // initial
      .mockResolvedValueOnce(mockTasks)    // after rename commit
      .mockResolvedValueOnce(mockTasks)    // after delete reload
      .mockResolvedValueOnce(tasksWithNew) // after create
      .mockResolvedValue(mockTasks);       // all subsequent reloads
    setupMockApi({
      tasksCreate: vi.fn().mockResolvedValue(newTask),
      tasksGetByList,
    });
    render(<App />);
    await navigateToTasksPane();

    // Action 1: rename t1
    await renameTask('Alpha');
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Alpha'));

    // Action 2: delete t1
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('t1'));

    // Action 3: create new task + name it
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    await waitFor(() => expect(window.api.tasksCreate).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeDefined());
    const input = document.querySelector('.tasks-pane .edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('new', 'Beta'));
    await waitFor(() => expect(document.querySelector('.tasks-pane .edit-input')).toBeNull());

    // Stack: [rename t1→Alpha, delete t1, create new, rename new→Beta]
    // Undo 4: rename new → ''
    undo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('new', ''));

    // Undo 3: create new → delete it
    undo();
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('new'));

    // Undo 2: delete t1 → restore it
    undo();
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledWith('t1'));

    // Undo 1: rename t1 → revert to Task 1
    undo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Task 1'));

    // Extra undo does nothing
    const deleteCalls = (window.api.tasksDelete as ReturnType<typeof vi.fn>).mock.calls.length;
    const updateCalls = (window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls.length;
    undo();
    await new Promise((r) => setTimeout(r, 50));
    expect((window.api.tasksDelete as ReturnType<typeof vi.fn>).mock.calls.length).toBe(deleteCalls);
    expect((window.api.tasksUpdate as ReturnType<typeof vi.fn>).mock.calls.length).toBe(updateCalls);

    // Redo 1: rename t1 → Alpha
    redo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('t1', 'Alpha'));

    // Redo 2: re-delete t1
    redo();
    await waitFor(() => expect(window.api.tasksDelete).toHaveBeenCalledWith('t1'));

    // Redo 3: restore new task creation
    redo();
    await waitFor(() => expect(window.api.tasksRestore).toHaveBeenCalledWith(
      'new', '1', '', 'PENDING', 50, null, 3, 50, 50,
    ));

    // Redo 4: rename new → Beta
    redo();
    await waitFor(() => expect(window.api.tasksUpdate).toHaveBeenCalledWith('new', 'Beta'));
  });

  it('undo move restores task to original list, redo re-moves it', async () => {
    const tasksGetByList = vi.fn().mockResolvedValue(mockTasks);
    setupMockApi({ tasksGetByList });
    render(<App />);
    await navigateToTasksPane();

    // Move t1 to list '2' (Work)
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // target = Work
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '2'));

    // Undo → should move back to original list '1'
    undo();
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledWith('t1', '1'));

    // Redo → should move to '2' again
    redo();
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledTimes(3));
    const calls = (window.api.tasksMove as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1]).toEqual(['t1', '2']);
  });

  it('undo move from inbox uses tasksSetListId to restore null list_id', async () => {
    const inboxTasks: Task[] = [
      { id: 'it1', list_id: null, title: 'Inbox Task', status: 'PENDING', created_timestamp: 0, completed_timestamp: null, due_date: null, sort_key: 1, created_at: 0, updated_at: 0, deleted_at: null, notes: null, parent_id: null, is_expanded: 1 },
    ];
    setupMockApi({
      tasksGetInbox: vi.fn().mockResolvedValue(inboxTasks),
    });
    render(<App />);
    // Inbox is selected by default — switch to tasks pane
    await waitFor(() => expect(screen.getByText('Inbox Task')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Move inbox task to list '2' (Work) — target index: Inbox=0, Work=1
    fireEvent.keyDown(window, { key: 'm' });
    await waitFor(() => expect(screen.getByText(/Move to:/)).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // target = Work
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(window.api.tasksMove).toHaveBeenCalledWith('it1', '2'));

    // Undo → task had null list_id, so should use tasksSetListId
    undo();
    await waitFor(() => expect(window.api.tasksSetListId).toHaveBeenCalledWith('it1', null));
  });

  it('undo list rename reverts name, redo re-applies it', async () => {
    setupMockApi();
    render(<App />);
    await navigateToUserList();

    // Rename list
    fireEvent.keyDown(window, { key: 'e' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    const input = document.querySelector('.lists-pane input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Renamed List' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.api.listsUpdate).toHaveBeenCalledWith('1', 'Renamed List'));
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeNull());

    // Undo → revert to original name
    undo();
    await waitFor(() => expect(window.api.listsUpdate).toHaveBeenCalledWith('1', 'Inbox'));

    // Redo → re-apply rename
    redo();
    await waitFor(() => {
      const calls = (window.api.listsUpdate as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[calls.length - 1]).toEqual(['1', 'Renamed List']);
    });
  });

  it('undo list creation deletes list, redo restores it', async () => {
    const newList = { id: 'new-list', folder_id: null, name: '', sort_key: 3, created_at: 100, updated_at: 100 };
    setupMockApi({
      listsCreate: vi.fn().mockResolvedValue(newList),
      listsDelete: vi.fn().mockResolvedValue(undefined),
      listsRestore: vi.fn().mockResolvedValue(newList),
    });
    render(<App />);
    await navigateToUserList();

    // Create new list
    fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true });
    await waitFor(() => expect(window.api.listsCreate).toHaveBeenCalled());
    // Wait for edit mode to appear and dismiss it
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.lists-pane input')).toBeNull());

    // Undo → delete the list
    undo();
    await waitFor(() => expect(window.api.listsDelete).toHaveBeenCalledWith('new-list'));

    // Redo → restore the list
    redo();
    await waitFor(() => expect(window.api.listsRestore).toHaveBeenCalledWith('new-list', null, '', 3, 100, 100));
  });

  it('undo list deletion restores list and tasks from trash, redo re-deletes', async () => {
    const trashedTasks = mockTasks.map(t => ({ ...t, deleted_at: Date.now() }));
    setupMockApi({
      tasksGetByList: vi.fn().mockResolvedValue(mockTasks),
      tasksGetTrashed: vi.fn().mockResolvedValue(trashedTasks),
    });
    render(<App />);
    await navigateToUserList();

    // Delete the list
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(window.api.listsDelete).toHaveBeenCalled());

    // Undo → restore list and tasks from trash
    undo();
    await waitFor(() => expect(window.api.listsRestore).toHaveBeenCalled());
    await waitFor(() => expect(window.api.tasksRestoreFromTrash).toHaveBeenCalledTimes(mockTasks.length));

    // Redo → re-delete
    redo();
    await waitFor(() => expect(window.api.listsDelete).toHaveBeenCalledTimes(2));
  });
});
