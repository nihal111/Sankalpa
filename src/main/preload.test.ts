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

    api.listsCreate('id1', 'name1');
    expect(mockInvoke).toHaveBeenCalledWith('lists:create', 'id1', 'name1');

    api.listsUpdate('id1', 'newname');
    expect(mockInvoke).toHaveBeenCalledWith('lists:update', 'id1', 'newname');

    api.listsDelete('id1');
    expect(mockInvoke).toHaveBeenCalledWith('lists:delete', 'id1');

    api.listsReorder('id1', 1.5);
    expect(mockInvoke).toHaveBeenCalledWith('lists:reorder', 'id1', 1.5);
  });

  it('task methods invoke correct IPC channels', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.tasksGetByList('list1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:getByList', 'list1');

    api.tasksCreate('t1', 'list1', 'title');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:create', 't1', 'list1', 'title');

    api.tasksUpdate('t1', 'newtitle');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:update', 't1', 'newtitle');

    api.tasksDelete('t1');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:delete', 't1');

    api.tasksReorder('t1', 2.5);
    expect(mockInvoke).toHaveBeenCalledWith('tasks:reorder', 't1', 2.5);

    api.tasksMove('t1', 'list2');
    expect(mockInvoke).toHaveBeenCalledWith('tasks:move', 't1', 'list2');
  });

  it('calcSortKey invokes correct IPC channel', async () => {
    await import('./preload');

    const api = mockExposeInMainWorld.mock.calls[0][1];

    api.calcSortKey(1, 2);
    expect(mockInvoke).toHaveBeenCalledWith('util:calcSortKey', 1, 2);

    api.calcSortKey(null, 1);
    expect(mockInvoke).toHaveBeenCalledWith('util:calcSortKey', null, 1);
  });
});
