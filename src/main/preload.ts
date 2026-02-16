import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onQuickAdd: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('quick-add', handler);
    return () => ipcRenderer.removeListener('quick-add', handler);
  },

  // Lists
  listsGetAll: () => ipcRenderer.invoke('lists:getAll'),
  listsCreate: (id: string, name: string) => ipcRenderer.invoke('lists:create', id, name),
  listsUpdate: (id: string, name: string) => ipcRenderer.invoke('lists:update', id, name),
  listsDelete: (id: string) => ipcRenderer.invoke('lists:delete', id),
  listsReorder: (id: string, sortKey: number) => ipcRenderer.invoke('lists:reorder', id, sortKey),

  // Tasks
  tasksGetByList: (listId: string) => ipcRenderer.invoke('tasks:getByList', listId),
  tasksCreate: (id: string, listId: string, title: string) => ipcRenderer.invoke('tasks:create', id, listId, title),
  tasksUpdate: (id: string, title: string) => ipcRenderer.invoke('tasks:update', id, title),
  tasksDelete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  tasksReorder: (id: string, sortKey: number) => ipcRenderer.invoke('tasks:reorder', id, sortKey),
  tasksMove: (id: string, newListId: string) => ipcRenderer.invoke('tasks:move', id, newListId),

  // Util
  calcSortKey: (before: number | null, after: number | null) => ipcRenderer.invoke('util:calcSortKey', before, after),
});
