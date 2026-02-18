import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import {
  getDb, closeDb, saveDb,
  getAllFolders, createFolder, updateFolder, deleteFolder, toggleFolderExpanded,
  getAllLists, createList, updateList, deleteList, reorderList, moveList, getTaskCount,
  getInboxTasks, getInboxTaskCount, getTasksByList, createTask, updateTask, deleteTask, reorderTask, moveTask,
  calcSortKeyBetween,
} from './db/index.js';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function toggleWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function showQuickAdd(): void {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('quick-add');
}

app.whenReady().then(async () => {
  const db = await getDb();
  createWindow();

  // Folder IPC handlers
  ipcMain.handle('folders:getAll', () => getAllFolders(db));
  ipcMain.handle('folders:create', (_, id: string, name: string) => { const r = createFolder(db, id, name); saveDb(); return r; });
  ipcMain.handle('folders:update', (_, id: string, name: string) => { updateFolder(db, id, name); saveDb(); });
  ipcMain.handle('folders:delete', (_, id: string) => { deleteFolder(db, id); saveDb(); });
  ipcMain.handle('folders:toggleExpanded', (_, id: string) => { toggleFolderExpanded(db, id); saveDb(); });

  // List IPC handlers
  ipcMain.handle('lists:getAll', () => getAllLists(db));
  ipcMain.handle('lists:create', (_, id: string, name: string, folderId?: string) => { const r = createList(db, id, name, folderId); saveDb(); return r; });
  ipcMain.handle('lists:update', (_, id: string, name: string) => { updateList(db, id, name); saveDb(); });
  ipcMain.handle('lists:delete', (_, id: string) => { deleteList(db, id); saveDb(); });
  ipcMain.handle('lists:reorder', (_, id: string, sortKey: number) => { reorderList(db, id, sortKey); saveDb(); });
  ipcMain.handle('lists:move', (_, id: string, folderId: string | null) => { moveList(db, id, folderId); saveDb(); });
  ipcMain.handle('lists:getTaskCount', (_, listId: string) => getTaskCount(db, listId));

  // Task IPC handlers
  ipcMain.handle('tasks:getInbox', () => getInboxTasks(db));
  ipcMain.handle('tasks:getInboxCount', () => getInboxTaskCount(db));
  ipcMain.handle('tasks:getByList', (_, listId: string) => getTasksByList(db, listId));
  ipcMain.handle('tasks:create', (_, id: string, listId: string | null, title: string) => { const r = createTask(db, id, listId, title); saveDb(); return r; });
  ipcMain.handle('tasks:update', (_, id: string, title: string) => { updateTask(db, id, title); saveDb(); });
  ipcMain.handle('tasks:delete', (_, id: string) => { deleteTask(db, id); saveDb(); });
  ipcMain.handle('tasks:reorder', (_, id: string, sortKey: number) => { reorderTask(db, id, sortKey); saveDb(); });
  ipcMain.handle('tasks:move', (_, id: string, newListId: string) => { moveTask(db, id, newListId); saveDb(); });

  ipcMain.handle('util:calcSortKey', (_, before: number | null, after: number | null) => calcSortKeyBetween(before, after));

  // Global hotkeys
  globalShortcut.register('CommandOrControl+Option+Control+Space', toggleWindow);
  globalShortcut.register('CommandOrControl+Option+Shift+Space', showQuickAdd);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closeDb();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
