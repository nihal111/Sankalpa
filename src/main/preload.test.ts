import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOn = vi.fn();
const mockRemoveListener = vi.fn();
const mockInvoke = vi.fn();
const mockExposeInMainWorld = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: unknown) => mockExposeInMainWorld(name, api),
  },
  ipcRenderer: {
    on: (channel: string, handler: () => void) => mockOn(channel, handler),
    removeListener: (channel: string, handler: () => void) => mockRemoveListener(channel, handler),
    invoke: (channel: string, ...args: unknown[]) => mockInvoke(channel, ...args),
  },
}));

describe('preload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exposes api to main world', async () => {
    await import('./preload');

    expect(mockExposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object));
  });

  it('onQuickAdd registers and unregisters listener', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];
    const callback = vi.fn();

    const unsubscribe = api.onQuickAdd(callback);

    expect(mockOn).toHaveBeenCalledWith('quick-add', expect.any(Function));

    // Simulate event
    const handler = mockOn.mock.calls[0][1];
    handler();
    expect(callback).toHaveBeenCalled();

    // Unsubscribe
    unsubscribe();
    expect(mockRemoveListener).toHaveBeenCalledWith('quick-add', handler);
  });

  it('list methods invoke correct IPC channels', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.listsGetAll();
    expect(mockInvoke).toHaveBeenCalledWith('lists:getAll');

    api.listsCreate('id1', 'name1', 'folder1');
    expect(mockInvoke).toHaveBeenCalledWith('lists:create', 'id1', 'name1', 'folder1');

    api.listsUpdate('id1', 'newname');
    expect(mockInvoke).toHaveBeenCalledWith('lists:update', 'id1', 'newname');

    api.listsDelete('id1');
    expect(mockInvoke).toHaveBeenCalledWith('lists:delete', 'id1');

    api.listsReorder('id1', 1.5);
    expect(mockInvoke).toHaveBeenCalledWith('lists:reorder', 'id1', 1.5);

    api.listsMove('id1', 'folder2');
    expect(mockInvoke).toHaveBeenCalledWith('lists:move', 'id1', 'folder2');

    api.listsGetTaskCount('id1');
    expect(mockInvoke).toHaveBeenCalledWith('lists:getTaskCount', 'id1');
  });

  it('folder methods invoke correct IPC channels', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.foldersGetAll();
    expect(mockInvoke).toHaveBeenCalledWith('folders:getAll');

    api.foldersCreate('f1', 'Folder');
    expect(mockInvoke).toHaveBeenCalledWith('folders:create', 'f1', 'Folder');

    api.foldersUpdate('f1', 'New Folder');
    expect(mockInvoke).toHaveBeenCalledWith('folders:update', 'f1', 'New Folder');

    api.foldersDelete('f1');
    expect(mockInvoke).toHaveBeenCalledWith('folders:delete', 'f1');

    api.foldersToggleExpanded('f1');
    expect(mockInvoke).toHaveBeenCalledWith('folders:toggleExpanded', 'f1');
  });

  it('task methods invoke correct IPC channels', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.tasksGetInbox();
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getInbox');

    api.tasksGetCompleted();
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getCompleted');

    api.tasksGetInboxCount();
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getInboxCount');

    api.tasksGetByList('list1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getByList', 'list1');

    api.tasksCreate('t1', 'list1', 'title');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:create', 't1', 'list1', 'title');

    api.tasksUpdate('t1', 'newtitle');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:update', 't1', 'newtitle');

    api.tasksToggleCompleted('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:toggleCompleted', 't1');

    api.tasksDelete('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:delete', 't1');

    api.tasksReorder('t1', 2.5);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:reorder', 't1', 2.5);

    api.tasksMove('t1', 'list2');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:move', 't1', 'list2');

    api.tasksSetDueDate('t1', 1000);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:setDueDate', 't1', 1000);

    api.tasksGetTrashed();
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getTrashed');

    api.tasksSoftDelete('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:softDelete', 't1');

    api.tasksRestoreFromTrash('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:restoreFromTrash', 't1');

    api.tasksRestore('t1', 'list1', 'title', 'PENDING', 0, null, 1, 0, 0, null);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:restore', 't1', 'list1', 'title', 'PENDING', 0, null, 1, 0, 0, null);

    api.tasksSetListId('t1', 'list2');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:setListId', 't1', 'list2');

    api.tasksGetDueBetween(100, 200);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getDueBetween', 100, 200);

    api.tasksGetOverdue(300);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getOverdue', 300);

    api.tasksGetUpcoming(400);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getUpcoming', 400);

    api.tasksGetAll();
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getAll');

    api.tasksUpdateNotes('t1', 'some notes');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:updateNotes', 't1', 'some notes');

    api.tasksSetParentId('t1', 'p1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:setParentId', 't1', 'p1');

    api.tasksToggleExpanded('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:toggleExpanded', 't1');

    api.tasksGetDescendants('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getDescendants', 't1');
  });

  it('settings methods invoke correct IPC channels', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.settingsGetAll();
    expect(mockInvoke).toHaveBeenCalledWith('settings:getAll');

    api.settingsSet('theme', 'dark');
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', 'theme', 'dark');
  });

  it('calcSortKey invokes correct IPC channel', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.calcSortKey(1, 2);
    expect(mockInvoke).toHaveBeenCalledWith('util:calcSortKey', 1, 2);

    api.calcSortKey(null, 1);
    expect(mockInvoke).toHaveBeenCalledWith('util:calcSortKey', null, 1);
  });

  it('listsRestore invokes correct IPC channel', async () => {
    await import('./preload');
    const api = mockExposeInMainWorld.mock.calls[0][1];
    api.listsRestore('l1', null, 'My List', 5, 100, 200);
    expect(mockInvoke).toHaveBeenCalledWith('lists:restore', 'l1', null, 'My List', 5, 100, 200);
  });

  it('onTaskCreated registers and unregisters listener', async () => {
    await import('./preload');
    const api = mockExposeInMainWorld.mock.calls[0][1];
    const callback = vi.fn();
    const unsubscribe = api.onTaskCreated(callback);
    expect(mockOn).toHaveBeenCalledWith('tasks:created', expect.any(Function));
    const handler = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'tasks:created')![1];
    handler(null, { id: 't1', listId: 'l1' });
    expect(callback).toHaveBeenCalledWith({ id: 't1', listId: 'l1' });
    unsubscribe();
    expect(mockRemoveListener).toHaveBeenCalledWith('tasks:created', handler);
  });
});
