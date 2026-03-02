import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();
const mockSend = vi.fn();
const mockExposeInMainWorld = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: unknown) => mockExposeInMainWorld(name, api),
  },
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => mockInvoke(channel, ...args),
    send: (channel: string, ...args: unknown[]) => mockSend(channel, ...args),
  },
}));

describe('preload-quickadd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exposes quickAddApi to main world', async () => {
    await import('./preload-quickadd');
    expect(mockExposeInMainWorld).toHaveBeenCalledWith('quickAddApi', expect.any(Object));
  });

  it('getLists invokes lists:getAll', async () => {
    await import('./preload-quickadd');
    const api = mockExposeInMainWorld.mock.calls[0][1];
    api.getLists();
    expect(mockInvoke).toHaveBeenCalledWith('lists:getAll');
  });

  it('submit sends quickadd:submit with data', async () => {
    await import('./preload-quickadd');
    const api = mockExposeInMainWorld.mock.calls[0][1];
    const data = { title: 'Test', listId: 'l1', dueDate: 1000, duration: 30, notes: 'note' };
    api.submit(data);
    expect(mockSend).toHaveBeenCalledWith('quickadd:submit', data);
  });

  it('close sends quickadd:close', async () => {
    await import('./preload-quickadd');
    const api = mockExposeInMainWorld.mock.calls[0][1];
    api.close();
    expect(mockSend).toHaveBeenCalledWith('quickadd:close');
  });
});
