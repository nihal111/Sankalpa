import { app, BrowserWindow, globalShortcut, ipcMain, nativeImage, screen, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  getDb, closeDb, saveDb, reloadDb,
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
import { testConnection, syncToCloud, restoreFromCloud, listSnapshots, restoreFromSnapshot } from './cloud';

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

  let currentDb = await getDb();
  const db = (): typeof currentDb => currentDb;

  // Purge expired trash on startup
  const retentionSetting = getSetting(db(), 'trash_retention_days');
  const retentionDays = parseRetentionDays(retentionSetting);
  purgeExpiredTrash(db(), retentionDays);
  saveDb();

  createWindow();

  // Reload db from disk and notify renderer
  const dbPath = path.join(app.getPath('userData'), 'sankalpa.db');
  const triggerReload = async (): Promise<void> => {
    currentDb = await reloadDb();
    mainWindow?.webContents.send('db:reloaded');
  };

  // Watch directory for db file changes (survives delete + recreate)
  const dbDir = path.dirname(dbPath);
  const dbFile = path.basename(dbPath);
  let lastMtime = 0;
  let selfWriting = false;
  try {
    lastMtime = fs.statSync(dbPath).mtimeMs;
  } catch { /* file may not exist yet */ }
  fs.watch(dbDir, async (_, filename) => {
    if (filename !== dbFile || selfWriting) return;
    try {
      const mtime = fs.statSync(dbPath).mtimeMs;
      if (mtime !== lastMtime) {
        lastMtime = mtime;
        await triggerReload();
      }
    } catch { /* file deleted, ignore */ }
  });
  const wrappedSaveDb = (): void => {
    selfWriting = true;
    saveDb();
    try { lastMtime = fs.statSync(dbPath).mtimeMs; } catch { /* */ }
    selfWriting = false;
  };

  // Cmd+R reloads db from disk before renderer refreshes
  mainWindow?.webContents.on('before-input-event', async (event, input) => {
    if (input.type === 'keyDown' && input.key === 'r' && input.meta && !input.shift && !input.alt) {
      event.preventDefault();
      await triggerReload();
      mainWindow?.webContents.reload();
    }
  });

  // Folder IPC handlers
  ipcMain.handle('folders:getAll', () => getAllFolders(db()));
  ipcMain.handle('folders:create', (_, id: string, name: string) => { const r = createFolder(db(), id, name); wrappedSaveDb(); return r; });
  ipcMain.handle('folders:update', (_, id: string, name: string) => { updateFolder(db(), id, name); wrappedSaveDb(); });
  ipcMain.handle('folders:delete', (_, id: string) => { deleteFolder(db(), id); wrappedSaveDb(); });
  ipcMain.handle('folders:toggleExpanded', (_, id: string) => { toggleFolderExpanded(db(), id); wrappedSaveDb(); });
  ipcMain.handle('folders:reorder', (_, id: string, sortKey: number) => { reorderFolder(db(), id, sortKey); wrappedSaveDb(); });

  // List IPC handlers
  ipcMain.handle('lists:getAll', () => getAllLists(db()));
  ipcMain.handle('lists:create', (_, id: string, name: string, folderId?: string) => { const r = createList(db(), id, name, folderId); wrappedSaveDb(); return r; });
  ipcMain.handle('lists:update', (_, id: string, name: string) => { updateList(db(), id, name); wrappedSaveDb(); });
  ipcMain.handle('lists:updateNotes', (_, id: string, notes: string | null) => { updateListNotes(db(), id, notes); wrappedSaveDb(); });
  ipcMain.handle('lists:delete', (_, id: string) => { deleteList(db(), id); wrappedSaveDb(); });
  ipcMain.handle('lists:reorder', (_, id: string, sortKey: number) => { reorderList(db(), id, sortKey); wrappedSaveDb(); });
  ipcMain.handle('lists:move', (_, id: string, folderId: string | null) => { moveList(db(), id, folderId); wrappedSaveDb(); });
  ipcMain.handle('lists:getTaskCount', (_, listId: string) => getTaskCount(db(), listId));

  // Task IPC handlers
  ipcMain.handle('tasks:getInbox', () => getInboxTasks(db()));
  ipcMain.handle('tasks:getInboxCount', () => getInboxTaskCount(db()));
  ipcMain.handle('tasks:getCompleted', () => getCompletedTasks(db()));
  ipcMain.handle('tasks:getByList', (_, listId: string) => getTasksByList(db(), listId));
  ipcMain.handle('tasks:getTrashed', () => getTrashedTasks(db()));
  ipcMain.handle('tasks:getAll', () => getAllTasks(db()));
  ipcMain.handle('tasks:create', (_, id: string, listId: string | null, title: string) => { const r = createTask(db(), id, listId, title); wrappedSaveDb(); return r; });
  ipcMain.handle('tasks:update', (_, id: string, title: string) => { updateTask(db(), id, title); wrappedSaveDb(); });
  ipcMain.handle('tasks:toggleCompleted', (_, id: string) => { toggleTaskCompleted(db(), id); wrappedSaveDb(); });
  ipcMain.handle('tasks:delete', (_, id: string) => { deleteTask(db(), id); wrappedSaveDb(); });
  ipcMain.handle('tasks:softDelete', (_, id: string) => { softDeleteTask(db(), id); wrappedSaveDb(); });
  ipcMain.handle('tasks:restoreFromTrash', (_, id: string) => { restoreFromTrash(db(), id); wrappedSaveDb(); });
  ipcMain.handle('tasks:reorder', (_, id: string, sortKey: number) => { reorderTask(db(), id, sortKey); wrappedSaveDb(); });
  ipcMain.handle('tasks:move', (_, id: string, newListId: string) => { moveTask(db(), id, newListId); wrappedSaveDb(); });
  ipcMain.handle('tasks:restore', (_, id: string, listId: string | null, title: string, status: string, createdTimestamp: number, completedTimestamp: number | null, sortKey: number, createdAt: number, updatedAt: number, deletedAt?: number | null) => { restoreTask(db(), id, listId, title, status, createdTimestamp, completedTimestamp, sortKey, createdAt, updatedAt, deletedAt); wrappedSaveDb(); });
  ipcMain.handle('tasks:setListId', (_, id: string, listId: string | null) => { setTaskListId(db(), id, listId); wrappedSaveDb(); });
  ipcMain.handle('tasks:setDueDate', (_, id: string, dueDate: number | null) => { setTaskDueDate(db(), id, dueDate); wrappedSaveDb(); });
  ipcMain.handle('tasks:setDuration', (_, id: string, duration: number | null) => { setTaskDuration(db(), id, duration); wrappedSaveDb(); });
  ipcMain.handle('tasks:updateNotes', (_, id: string, notes: string | null) => { updateTaskNotes(db(), id, notes); wrappedSaveDb(); });
  ipcMain.handle('tasks:getDueBetween', (_, start: number, end: number) => getTasksDueBetween(db(), start, end));
  ipcMain.handle('tasks:getOverdue', (_, before: number) => getOverdueTasks(db(), before));
  ipcMain.handle('tasks:getUpcoming', (_, from: number) => getUpcomingTasks(db(), from));
  ipcMain.handle('tasks:setParentId', (_, id: string, parentId: string | null) => { setTaskParentId(db(), id, parentId); wrappedSaveDb(); });
  ipcMain.handle('tasks:toggleExpanded', (_, id: string) => { toggleTaskExpanded(db(), id); wrappedSaveDb(); });
  ipcMain.handle('tasks:getDescendants', (_, id: string) => getTaskDescendants(db(), id));

  // List undo
  ipcMain.handle('lists:restore', (_, id: string, folderId: string | null, name: string, sortKey: number, createdAt: number, updatedAt: number) => { restoreList(db(), id, folderId, name, sortKey, createdAt, updatedAt); wrappedSaveDb(); });

  ipcMain.handle('util:calcSortKey', (_, before: number | null, after: number | null) => calcSortKeyBetween(before, after));
  ipcMain.handle('util:normalizeListSortKeys', () => { normalizeListSortKeys(db()); wrappedSaveDb(); });
  ipcMain.handle('util:normalizeTaskSortKeys', (_, listId: string | null) => { normalizeTaskSortKeys(db(), listId); wrappedSaveDb(); });

  // Settings IPC handlers
  ipcMain.handle('settings:getAll', () => getAllSettings(db()));
  ipcMain.handle('settings:set', (_, key: string, value: string) => { setSetting(db(), key, value); wrappedSaveDb(); });

  // Cloud sync IPC handlers
  ipcMain.handle('cloud:testConnection', (_, url: string, key: string) => testConnection(url, key));
  ipcMain.handle('cloud:sync', async () => {
    const url = getSetting(db(), 'supabase_url');
    const key = getSetting(db(), 'supabase_service_role_key');
    if (!url || !key) return { success: false, message: 'Not configured' };
    return syncToCloud(db(), url, key);
  });
  ipcMain.handle('cloud:restore', async () => {
    const url = getSetting(db(), 'supabase_url');
    const key = getSetting(db(), 'supabase_service_role_key');
    if (!url || !key) return { success: false, message: 'Not configured' };
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const { result, exportedDb } = await restoreFromCloud(SQL, url, key);
    if (result.success && exportedDb) {
      fs.writeFileSync(dbPath, Buffer.from(exportedDb));
      await triggerReload();
      // Re-save credentials so they survive the restore
      setSetting(db(), 'supabase_url', url);
      setSetting(db(), 'supabase_service_role_key', key);
      wrappedSaveDb();
    }
    return result;
  });
  ipcMain.handle('cloud:listSnapshots', async () => {
    const url = getSetting(db(), 'supabase_url');
    const key = getSetting(db(), 'supabase_service_role_key');
    if (!url || !key) return { result: { success: false, message: 'Not configured' }, snapshots: [] };
    return listSnapshots(url, key);
  });
  ipcMain.handle('cloud:restoreSnapshot', async (_, snapshotId: string) => {
    const url = getSetting(db(), 'supabase_url');
    const key = getSetting(db(), 'supabase_service_role_key');
    if (!url || !key) return { success: false, message: 'Not configured' };
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const { result, exportedDb } = await restoreFromSnapshot(SQL, url, key, snapshotId);
    if (result.success && exportedDb) {
      fs.writeFileSync(dbPath, Buffer.from(exportedDb));
      await triggerReload();
      setSetting(db(), 'supabase_url', url);
      setSetting(db(), 'supabase_service_role_key', key);
      wrappedSaveDb();
    }
    return result;
  });

  // Trash purge
  ipcMain.handle('trash:purge', (_, retentionDays: number | null) => { purgeExpiredTrash(db(), retentionDays); wrappedSaveDb(); });

  // Shell
  ipcMain.handle('shell:openExternal', (_, url: string) => shell.openExternal(url));

  // Quick-add overlay handlers
  ipcMain.on('quickadd:submit', (_, data: { title: string; listId: string | null; dueDate: number | null; duration: number | null; notes: string }) => {
    const id = crypto.randomUUID();
    createTask(db(), id, data.listId, data.title);
    if (data.dueDate) setTaskDueDate(db(), id, data.dueDate);
    if (data.duration) setTaskDuration(db(), id, data.duration);
    if (data.notes) updateTaskNotes(db(), id, data.notes);
    wrappedSaveDb();
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
