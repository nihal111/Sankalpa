import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onQuickAdd: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('quick-add', handler);
    return () => ipcRenderer.removeListener('quick-add', handler);
  },

  // Folders
  foldersGetAll: () => ipcRenderer.invoke('folders:getAll'),
  foldersCreate: (id: string, name: string) => ipcRenderer.invoke('folders:create', id, name),
  foldersUpdate: (id: string, name: string) => ipcRenderer.invoke('folders:update', id, name),
  foldersDelete: (id: string) => ipcRenderer.invoke('folders:delete', id),
  foldersToggleExpanded: (id: string) => ipcRenderer.invoke('folders:toggleExpanded', id),

  // Lists
  listsGetAll: () => ipcRenderer.invoke('lists:getAll'),
  listsCreate: (id: string, name: string, folderId?: string) => ipcRenderer.invoke('lists:create', id, name, folderId),
  listsUpdate: (id: string, name: string) => ipcRenderer.invoke('lists:update', id, name),
  listsDelete: (id: string) => ipcRenderer.invoke('lists:delete', id),
  listsReorder: (id: string, sortKey: number) => ipcRenderer.invoke('lists:reorder', id, sortKey),
  listsMove: (id: string, folderId: string | null) => ipcRenderer.invoke('lists:move', id, folderId),
  listsGetTaskCount: (listId: string) => ipcRenderer.invoke('lists:getTaskCount', listId),

  // Tasks
  tasksGetInbox: () => ipcRenderer.invoke('tasks:getInbox'),
  tasksGetInboxCount: () => ipcRenderer.invoke('tasks:getInboxCount'),
  tasksGetByList: (listId: string) => ipcRenderer.invoke('tasks:getByList', listId),
  tasksCreate: (id: string, listId: string | null, title: string) => ipcRenderer.invoke('tasks:create', id, listId, title),
  tasksUpdate: (id: string, title: string) => ipcRenderer.invoke('tasks:update', id, title),
  tasksDelete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  tasksReorder: (id: string, sortKey: number) => ipcRenderer.invoke('tasks:reorder', id, sortKey),
  tasksMove: (id: string, newListId: string) => ipcRenderer.invoke('tasks:move', id, newListId),

  // Util
  calcSortKey: (before: number | null, after: number | null) => ipcRenderer.invoke('util:calcSortKey', before, after),

  // Settings
  settingsGetAll: () => ipcRenderer.invoke('settings:getAll'),
  settingsSet: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
});
