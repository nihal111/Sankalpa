import { Database, SqlValue } from 'sql.js';
import type { List, Task } from '../../shared/types';

export type { List, Task };

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

// Lists

export function getAllLists(db: Database): List[] {
  return queryAll<List>(db, 'SELECT * FROM lists ORDER BY sort_key');
}

export function createList(db: Database, id: string, name: string): List {
  const maxKey = queryOne<{ max: number | null }>(db, 'SELECT MAX(sort_key) as max FROM lists');
  const sortKey = (maxKey?.max ?? 0) + 1;
  const now = Date.now();
  db.run('INSERT INTO lists (id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, sortKey, now, now]);
  return { id, name, sort_key: sortKey, created_at: now, updated_at: now };
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

// Tasks

export function getTasksByList(db: Database, listId: string): Task[] {
  return queryAll<Task>(db, 'SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_key', [listId]);
}

export function createTask(db: Database, id: string, listId: string, title: string): Task {
  const maxKey = queryOne<{ max: number | null }>(db, 'SELECT MAX(sort_key) as max FROM tasks WHERE list_id = ?', [listId]);
  const sortKey = (maxKey?.max ?? 0) + 1;
  const now = Date.now();
  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, listId, title, sortKey, now, now]);
  return { id, list_id: listId, title, sort_key: sortKey, created_at: now, updated_at: now };
}

export function updateTask(db: Database, id: string, title: string): void {
  db.run('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
}

export function deleteTask(db: Database, id: string): void {
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
}

export function reorderTask(db: Database, id: string, newSortKey: number): void {
  db.run('UPDATE tasks SET sort_key = ?, updated_at = ? WHERE id = ?', [newSortKey, Date.now(), id]);
}

export function moveTask(db: Database, id: string, newListId: string): void {
  const maxKey = queryOne<{ max: number | null }>(db, 'SELECT MAX(sort_key) as max FROM tasks WHERE list_id = ?', [newListId]);
  const sortKey = (maxKey?.max ?? 0) + 1;
  db.run('UPDATE tasks SET list_id = ?, sort_key = ?, updated_at = ? WHERE id = ?',
    [newListId, sortKey, Date.now(), id]);
}
