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
  listsUpdateNotes: (id: string, notes: string | null) => ipcRenderer.invoke('lists:updateNotes', id, notes),
  listsDelete: (id: string) => ipcRenderer.invoke('lists:delete', id),
  listsReorder: (id: string, sortKey: number) => ipcRenderer.invoke('lists:reorder', id, sortKey),
  listsMove: (id: string, folderId: string | null) => ipcRenderer.invoke('lists:move', id, folderId),
  listsGetTaskCount: (listId: string) => ipcRenderer.invoke('lists:getTaskCount', listId),

  // Tasks
  tasksGetInbox: () => ipcRenderer.invoke('tasks:getInbox'),
  tasksGetCompleted: () => ipcRenderer.invoke('tasks:getCompleted'),
  tasksGetInboxCount: () => ipcRenderer.invoke('tasks:getInboxCount'),
  tasksGetByList: (listId: string) => ipcRenderer.invoke('tasks:getByList', listId),
  tasksGetTrashed: () => ipcRenderer.invoke('tasks:getTrashed'),
  tasksGetAll: () => ipcRenderer.invoke('tasks:getAll'),
  tasksCreate: (id: string, listId: string | null, title: string) => ipcRenderer.invoke('tasks:create', id, listId, title),
  tasksUpdate: (id: string, title: string) => ipcRenderer.invoke('tasks:update', id, title),
  tasksToggleCompleted: (id: string) => ipcRenderer.invoke('tasks:toggleCompleted', id),
  tasksDelete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  tasksSoftDelete: (id: string) => ipcRenderer.invoke('tasks:softDelete', id),
  tasksRestoreFromTrash: (id: string) => ipcRenderer.invoke('tasks:restoreFromTrash', id),
  tasksReorder: (id: string, sortKey: number) => ipcRenderer.invoke('tasks:reorder', id, sortKey),
  tasksMove: (id: string, newListId: string) => ipcRenderer.invoke('tasks:move', id, newListId),
  tasksRestore: (id: string, listId: string | null, title: string, status: string, createdTimestamp: number, completedTimestamp: number | null, sortKey: number, createdAt: number, updatedAt: number, deletedAt?: number | null) => ipcRenderer.invoke('tasks:restore', id, listId, title, status, createdTimestamp, completedTimestamp, sortKey, createdAt, updatedAt, deletedAt),
  tasksSetListId: (id: string, listId: string | null) => ipcRenderer.invoke('tasks:setListId', id, listId),
  tasksSetDueDate: (id: string, dueDate: number | null) => ipcRenderer.invoke('tasks:setDueDate', id, dueDate),
  tasksUpdateNotes: (id: string, notes: string | null) => ipcRenderer.invoke('tasks:updateNotes', id, notes),
  tasksGetDueBetween: (start: number, end: number) => ipcRenderer.invoke('tasks:getDueBetween', start, end),
  tasksGetOverdue: (before: number) => ipcRenderer.invoke('tasks:getOverdue', before),
  tasksGetUpcoming: (from: number) => ipcRenderer.invoke('tasks:getUpcoming', from),
  tasksSetParentId: (id: string, parentId: string | null) => ipcRenderer.invoke('tasks:setParentId', id, parentId),
  tasksToggleExpanded: (id: string) => ipcRenderer.invoke('tasks:toggleExpanded', id),
  tasksGetDescendants: (id: string) => ipcRenderer.invoke('tasks:getDescendants', id),

  // Lists undo
  listsRestore: (id: string, folderId: string | null, name: string, sortKey: number, createdAt: number, updatedAt: number) => ipcRenderer.invoke('lists:restore', id, folderId, name, sortKey, createdAt, updatedAt),

  // Util
  calcSortKey: (before: number | null, after: number | null) => ipcRenderer.invoke('util:calcSortKey', before, after),

  // Settings
  settingsGetAll: () => ipcRenderer.invoke('settings:getAll'),
  settingsSet: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

  // Trash purge
  trashPurge: (retentionDays: number | null) => ipcRenderer.invoke('trash:purge', retentionDays),
});
