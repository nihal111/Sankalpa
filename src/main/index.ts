import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import {
  getDb, closeDb,
  getAllLists, createList, updateList, deleteList, reorderList,
  getTasksByList, createTask, updateTask, deleteTask, reorderTask, moveTask,
  calcSortKeyBetween,
} from './db';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function showQuickAdd() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('quick-add');
}

app.whenReady().then(() => {
  getDb(); // Initialize database
  createWindow();

  // IPC handlers
  ipcMain.handle('lists:getAll', () => getAllLists());
  ipcMain.handle('lists:create', (_, id: string, name: string) => createList(id, name));
  ipcMain.handle('lists:update', (_, id: string, name: string) => updateList(id, name));
  ipcMain.handle('lists:delete', (_, id: string) => deleteList(id));
  ipcMain.handle('lists:reorder', (_, id: string, sortKey: number) => reorderList(id, sortKey));

  ipcMain.handle('tasks:getByList', (_, listId: string) => getTasksByList(listId));
  ipcMain.handle('tasks:create', (_, id: string, listId: string, title: string) => createTask(id, listId, title));
  ipcMain.handle('tasks:update', (_, id: string, title: string) => updateTask(id, title));
  ipcMain.handle('tasks:delete', (_, id: string) => deleteTask(id));
  ipcMain.handle('tasks:reorder', (_, id: string, sortKey: number) => reorderTask(id, sortKey));
  ipcMain.handle('tasks:move', (_, id: string, newListId: string) => moveTask(id, newListId));

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
