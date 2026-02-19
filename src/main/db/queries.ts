import { Database, SqlValue } from 'sql.js';
import type { Folder, List, Task } from '../../shared/types';

export type { Folder, List, Task };

function queryAll<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(db: Database, sql: string, params: SqlValue[] = []): T | undefined {
  const results = queryAll<T>(db, sql, params);
  return results[0];
}

function getNextSortKey(db: Database, table: 'folders' | 'lists' | 'tasks', listId?: string): number {
  const whereClause = listId ? ' WHERE list_id = ?' : '';
  const params = listId ? [listId] : [];
  const result = queryOne<{ max: number | null }>(db, `SELECT MAX(sort_key) as max FROM ${table}${whereClause}`, params);
  return (result?.max ?? 0) + 1;
}

// Folders

export function getAllFolders(db: Database): Folder[] {
  return queryAll<Folder>(db, 'SELECT * FROM folders ORDER BY sort_key');
}

export function createFolder(db: Database, id: string, name: string): Folder {
  const sortKey = getNextSortKey(db, 'folders');
  const now = Date.now();
  db.run('INSERT INTO folders (id, name, sort_key, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, sortKey, 1, now, now]);
  return { id, name, sort_key: sortKey, is_expanded: 1, created_at: now, updated_at: now };
}

export function updateFolder(db: Database, id: string, name: string): void {
  db.run('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id]);
}

export function deleteFolder(db: Database, id: string): void {
  // Move lists in folder to top level
  db.run('UPDATE lists SET folder_id = NULL WHERE folder_id = ?', [id]);
  db.run('DELETE FROM folders WHERE id = ?', [id]);
}

export function toggleFolderExpanded(db: Database, id: string): void {
  db.run('UPDATE folders SET is_expanded = NOT is_expanded, updated_at = ? WHERE id = ?', [Date.now(), id]);
}

// Lists

export function getAllLists(db: Database): List[] {
  return queryAll<List>(db, 'SELECT * FROM lists ORDER BY sort_key');
}

export function createList(db: Database, id: string, name: string, folderId?: string): List {
  const sortKey = getNextSortKey(db, 'lists');
  const now = Date.now();
  db.run('INSERT INTO lists (id, folder_id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, folderId ?? null, name, sortKey, now, now]);
  return { id, folder_id: folderId ?? null, name, sort_key: sortKey, created_at: now, updated_at: now };
}

export function updateList(db: Database, id: string, name: string): void {
  db.run('UPDATE lists SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id]);
}

export function deleteList(db: Database, id: string): void {
  db.run('DELETE FROM tasks WHERE list_id = ?', [id]);
  db.run('DELETE FROM lists WHERE id = ?', [id]);
}

export function reorderList(db: Database, id: string, newSortKey: number): void {
  db.run('UPDATE lists SET sort_key = ?, updated_at = ? WHERE id = ?', [newSortKey, Date.now(), id]);
}

export function moveList(db: Database, id: string, folderId: string | null): void {
  db.run('UPDATE lists SET folder_id = ?, updated_at = ? WHERE id = ?', [folderId, Date.now(), id]);
}

export function getTaskCount(db: Database, listId: string): number {
  const result = queryOne<{ count: number }>(db, "SELECT COUNT(*) as count FROM tasks WHERE list_id = ? AND status = 'PENDING'", [listId]);
  return result!.count;
}

// Tasks

export function getInboxTasks(db: Database): Task[] {
  return queryAll<Task>(db, 'SELECT * FROM tasks WHERE list_id IS NULL ORDER BY sort_key', []);
}

export function getCompletedTasks(db: Database): Task[] {
  return queryAll<Task>(db, "SELECT * FROM tasks WHERE status = 'COMPLETED' ORDER BY completed_timestamp DESC", []);
}

export function getInboxTaskCount(db: Database): number {
  const result = queryOne<{ count: number }>(db, "SELECT COUNT(*) as count FROM tasks WHERE list_id IS NULL AND status = 'PENDING'", []);
  return result!.count;
}

export function getTasksByList(db: Database, listId: string): Task[] {
  return queryAll<Task>(db, 'SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_key', [listId]);
}

export function createTask(db: Database, id: string, listId: string | null, title: string): Task {
  const sortKey = listId ? getNextSortKey(db, 'tasks', listId) : getNextSortKey(db, 'tasks');
  const now = Date.now();
  db.run('INSERT INTO tasks (id, list_id, title, status, created_timestamp, completed_timestamp, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, listId, title, 'PENDING', now, null, sortKey, now, now]);
  return {
    id,
    list_id: listId,
    title,
    status: 'PENDING',
    created_timestamp: now,
    completed_timestamp: null,
    sort_key: sortKey,
    created_at: now,
    updated_at: now,
  };
}

export function updateTask(db: Database, id: string, title: string): void {
  db.run('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
}

export function toggleTaskCompleted(db: Database, id: string): void {
  const now = Date.now();
  db.run(`
    UPDATE tasks
    SET
      status = CASE WHEN status = 'COMPLETED' THEN 'PENDING' ELSE 'COMPLETED' END,
      completed_timestamp = CASE WHEN status = 'COMPLETED' THEN NULL ELSE ? END,
      updated_at = ?
    WHERE id = ?
  `, [now, now, id]);
}

export function deleteTask(db: Database, id: string): void {
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
}

export function reorderTask(db: Database, id: string, newSortKey: number): void {
  db.run('UPDATE tasks SET sort_key = ?, updated_at = ? WHERE id = ?', [newSortKey, Date.now(), id]);
}

export function moveTask(db: Database, id: string, newListId: string): void {
  const sortKey = getNextSortKey(db, 'tasks', newListId);
  db.run('UPDATE tasks SET list_id = ?, sort_key = ?, updated_at = ? WHERE id = ?',
    [newListId, sortKey, Date.now(), id]);
}

// Settings

export function getSetting(db: Database, key: string): string | undefined {
  const result = queryOne<{ value: string }>(db, 'SELECT value FROM settings WHERE key = ?', [key]);
  return result?.value;
}

export function setSetting(db: Database, key: string, value: string): void {
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export function getAllSettings(db: Database): Record<string, string> {
  const rows = queryAll<{ key: string; value: string }>(db, 'SELECT key, value FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
