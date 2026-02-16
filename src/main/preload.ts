import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onQuickAdd: (callback: () => void) => {
    ipcRenderer.on('quick-add', callback);
    return () => ipcRenderer.removeListener('quick-add', callback);
  },
});
