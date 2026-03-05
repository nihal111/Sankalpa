import { app, BrowserWindow, globalShortcut, ipcMain, nativeImage, screen, shell } from 'electron';
import path from 'path';
import {
  getDb, closeDb, saveDb,
  getAllFolders, createFolder, updateFolder, deleteFolder, toggleFolderExpanded, reorderFolder,
  getAllLists, createList, updateList, updateListNotes, deleteList, reorderList, moveList, getTaskCount,
  getInboxTasks, getCompletedTasks, getInboxTaskCount, getTasksByList, createTask, updateTask, toggleTaskCompleted, reorderTask, moveTask, deleteTask,
  restoreTask, restoreList, setTaskListId, setTaskDueDate, setTaskDuration, updateTaskNotes,
  getTasksDueBetween, getOverdueTasks, getUpcomingTasks,
  calcSortKeyBetween, getAllSettings, setSetting, getSetting,
  getTrashedTasks, softDeleteTask, restoreFromTrash, getAllTasks,
  setTaskParentId, toggleTaskExpanded, getTaskDescendants, purgeExpiredTrash,
  normalizeListSortKeys, normalizeTaskSortKeys,
} from './db';
import { parseRetentionDays } from '../shared/trashRetention';

app.setName('Sankalpa');

let mainWindow: BrowserWindow | null = null;
let quickAddWindow: BrowserWindow | null = null;
const isTestHeadless = process.argv.includes('--test-headless');
const iconPath = path.join(__dirname, '../../../assets/icon.png');

function createWindow(): void {
  const cursor = screen.getCursorScreenPoint();
  const { bounds } = screen.getDisplayNearestPoint(cursor);
  const [winW, winH] = [
    Math.min(Math.round(bounds.width * 0.75), 1600),
    Math.min(Math.round(bounds.height * 0.75), 1000),
  ];

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round(bounds.x + (bounds.width - winW) / 2),
    y: Math.round(bounds.y + (bounds.height - winH) / 2),
    show: !isTestHeadless,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
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
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.show();
    quickAddWindow.once('show', () => {
      quickAddWindow?.webContents.focus();
    });
    return;
  }

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const winW = 800;
  const winH = 600;

  // Center on the display where cursor is
  const x = Math.round(display.bounds.x + (display.bounds.width - winW) / 2);
  const y = Math.round(display.bounds.y + (display.bounds.height - winH) / 2);

  quickAddWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-quickadd.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  quickAddWindow.on('blur', () => {
    // Hide dock to prevent macOS from activating the app when window closes
    if (!mainWindow?.isVisible()) app.dock?.hide();
    quickAddWindow?.close();
  });

  quickAddWindow.on('closed', () => {
    quickAddWindow = null;
    // Restore dock icon
    app.dock?.show();
  });

  quickAddWindow.once('show', () => {
    quickAddWindow?.webContents.focus();
  });

  if (process.env.NODE_ENV === 'development') {
    quickAddWindow.loadURL('http://localhost:5173/quickadd.html');
  } else {
    quickAddWindow.loadFile(path.join(__dirname, '../../renderer/quickadd.html'));
  }

  quickAddWindow.show();
}

app.whenReady().then(async () => {
  app.dock?.setIcon(nativeImage.createFromPath(iconPath));

  const db = await getDb();

  // Purge expired trash on startup
  const retentionSetting = getSetting(db, 'trash_retention_days');
  const retentionDays = parseRetentionDays(retentionSetting);
  purgeExpiredTrash(db, retentionDays);
  saveDb();

  createWindow();

  // Folder IPC handlers
  ipcMain.handle('folders:getAll', () => getAllFolders(db));
  ipcMain.handle('folders:create', (_, id: string, name: string) => { const r = createFolder(db, id, name); saveDb(); return r; });
  ipcMain.handle('folders:update', (_, id: string, name: string) => { updateFolder(db, id, name); saveDb(); });
  ipcMain.handle('folders:delete', (_, id: string) => { deleteFolder(db, id); saveDb(); });
  ipcMain.handle('folders:toggleExpanded', (_, id: string) => { toggleFolderExpanded(db, id); saveDb(); });
  ipcMain.handle('folders:reorder', (_, id: string, sortKey: number) => { reorderFolder(db, id, sortKey); saveDb(); });

  // List IPC handlers
  ipcMain.handle('lists:getAll', () => getAllLists(db));
  ipcMain.handle('lists:create', (_, id: string, name: string, folderId?: string) => { const r = createList(db, id, name, folderId); saveDb(); return r; });
  ipcMain.handle('lists:update', (_, id: string, name: string) => { updateList(db, id, name); saveDb(); });
  ipcMain.handle('lists:updateNotes', (_, id: string, notes: string | null) => { updateListNotes(db, id, notes); saveDb(); });
  ipcMain.handle('lists:delete', (_, id: string) => { deleteList(db, id); saveDb(); });
  ipcMain.handle('lists:reorder', (_, id: string, sortKey: number) => { reorderList(db, id, sortKey); saveDb(); });
  ipcMain.handle('lists:move', (_, id: string, folderId: string | null) => { moveList(db, id, folderId); saveDb(); });
  ipcMain.handle('lists:getTaskCount', (_, listId: string) => getTaskCount(db, listId));

  // Task IPC handlers
  ipcMain.handle('tasks:getInbox', () => getInboxTasks(db));
  ipcMain.handle('tasks:getInboxCount', () => getInboxTaskCount(db));
  ipcMain.handle('tasks:getCompleted', () => getCompletedTasks(db));
  ipcMain.handle('tasks:getByList', (_, listId: string) => getTasksByList(db, listId));
  ipcMain.handle('tasks:getTrashed', () => getTrashedTasks(db));
  ipcMain.handle('tasks:getAll', () => getAllTasks(db));
  ipcMain.handle('tasks:create', (_, id: string, listId: string | null, title: string) => { const r = createTask(db, id, listId, title); saveDb(); return r; });
  ipcMain.handle('tasks:update', (_, id: string, title: string) => { updateTask(db, id, title); saveDb(); });
  ipcMain.handle('tasks:toggleCompleted', (_, id: string) => { toggleTaskCompleted(db, id); saveDb(); });
  ipcMain.handle('tasks:delete', (_, id: string) => { deleteTask(db, id); saveDb(); });
  ipcMain.handle('tasks:softDelete', (_, id: string) => { softDeleteTask(db, id); saveDb(); });
  ipcMain.handle('tasks:restoreFromTrash', (_, id: string) => { restoreFromTrash(db, id); saveDb(); });
  ipcMain.handle('tasks:reorder', (_, id: string, sortKey: number) => { reorderTask(db, id, sortKey); saveDb(); });
  ipcMain.handle('tasks:move', (_, id: string, newListId: string) => { moveTask(db, id, newListId); saveDb(); });
  ipcMain.handle('tasks:restore', (_, id: string, listId: string | null, title: string, status: string, createdTimestamp: number, completedTimestamp: number | null, sortKey: number, createdAt: number, updatedAt: number, deletedAt?: number | null) => { restoreTask(db, id, listId, title, status, createdTimestamp, completedTimestamp, sortKey, createdAt, updatedAt, deletedAt); saveDb(); });
  ipcMain.handle('tasks:setListId', (_, id: string, listId: string | null) => { setTaskListId(db, id, listId); saveDb(); });
  ipcMain.handle('tasks:setDueDate', (_, id: string, dueDate: number | null) => { setTaskDueDate(db, id, dueDate); saveDb(); });
  ipcMain.handle('tasks:setDuration', (_, id: string, duration: number | null) => { setTaskDuration(db, id, duration); saveDb(); });
  ipcMain.handle('tasks:updateNotes', (_, id: string, notes: string | null) => { updateTaskNotes(db, id, notes); saveDb(); });
  ipcMain.handle('tasks:getDueBetween', (_, start: number, end: number) => getTasksDueBetween(db, start, end));
  ipcMain.handle('tasks:getOverdue', (_, before: number) => getOverdueTasks(db, before));
  ipcMain.handle('tasks:getUpcoming', (_, from: number) => getUpcomingTasks(db, from));
  ipcMain.handle('tasks:setParentId', (_, id: string, parentId: string | null) => { setTaskParentId(db, id, parentId); saveDb(); });
  ipcMain.handle('tasks:toggleExpanded', (_, id: string) => { toggleTaskExpanded(db, id); saveDb(); });
  ipcMain.handle('tasks:getDescendants', (_, id: string) => getTaskDescendants(db, id));

  // List undo
  ipcMain.handle('lists:restore', (_, id: string, folderId: string | null, name: string, sortKey: number, createdAt: number, updatedAt: number) => { restoreList(db, id, folderId, name, sortKey, createdAt, updatedAt); saveDb(); });

  ipcMain.handle('util:calcSortKey', (_, before: number | null, after: number | null) => calcSortKeyBetween(before, after));
  ipcMain.handle('util:normalizeListSortKeys', () => { normalizeListSortKeys(db); saveDb(); });
  ipcMain.handle('util:normalizeTaskSortKeys', (_, listId: string | null) => { normalizeTaskSortKeys(db, listId); saveDb(); });

  // Settings IPC handlers
  ipcMain.handle('settings:getAll', () => getAllSettings(db));
  ipcMain.handle('settings:set', (_, key: string, value: string) => { setSetting(db, key, value); saveDb(); });

  // Trash purge
  ipcMain.handle('trash:purge', (_, retentionDays: number | null) => { purgeExpiredTrash(db, retentionDays); saveDb(); });

  // Shell
  ipcMain.handle('shell:openExternal', (_, url: string) => shell.openExternal(url));

  // Quick-add overlay handlers
  ipcMain.on('quickadd:submit', (_, data: { title: string; listId: string | null; dueDate: number | null; duration: number | null; notes: string }) => {
    const id = crypto.randomUUID();
    createTask(db, id, data.listId, data.title);
    if (data.dueDate) setTaskDueDate(db, id, data.dueDate);
    if (data.duration) setTaskDuration(db, id, data.duration);
    if (data.notes) updateTaskNotes(db, id, data.notes);
    saveDb();
    mainWindow?.webContents.send('tasks:created', { id, listId: data.listId });
    mainWindow?.show();
    mainWindow?.focus();
    quickAddWindow?.close();
  });
  ipcMain.on('quickadd:close', () => {
    quickAddWindow?.close();
  });

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
