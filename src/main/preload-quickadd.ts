import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('quickAddApi', {
  getLists: () => ipcRenderer.invoke('lists:getAll'),
  submit: (data: { title: string; listId: string | null; dueDate: number | null; duration: number | null; notes: string }) => {
    ipcRenderer.send('quickadd:submit', data);
  },
  close: () => ipcRenderer.send('quickadd:close'),
});
