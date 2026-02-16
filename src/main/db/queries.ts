import { getDb } from './connection';
export { calcSortKeyBetween } from '../../shared/sortKey';

export interface List {
  id: string;
  name: string;
  sort_key: number;
  created_at: number;
  updated_at: number;
}

export interface Task {
  id: string;
  list_id: string;
  title: string;
  sort_key: number;
  created_at: number;
  updated_at: number;
}

// Lists

export function getAllLists(): List[] {
  return getDb().prepare('SELECT * FROM lists ORDER BY sort_key').all() as List[];
}

export function createList(id: string, name: string): List {
  const db = getDb();
  const maxKey = db.prepare('SELECT MAX(sort_key) as max FROM lists').get() as { max: number | null };
  const sortKey = (maxKey.max ?? 0) + 1;
  const now = Date.now();
  db.prepare('INSERT INTO lists (id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, sortKey, now, now);
  return { id, name, sort_key: sortKey, created_at: now, updated_at: now };
}

export function updateList(id: string, name: string): void {
  getDb().prepare('UPDATE lists SET name = ?, updated_at = ? WHERE id = ?')
    .run(name, Date.now(), id);
}

export function deleteList(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE list_id = ?').run(id);
  db.prepare('DELETE FROM lists WHERE id = ?').run(id);
}

export function reorderList(id: string, newSortKey: number): void {
  getDb().prepare('UPDATE lists SET sort_key = ?, updated_at = ? WHERE id = ?')
    .run(newSortKey, Date.now(), id);
}

// Tasks

export function getTasksByList(listId: string): Task[] {
  return getDb().prepare('SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_key')
    .all(listId) as Task[];
}

export function createTask(id: string, listId: string, title: string): Task {
  const db = getDb();
  const maxKey = db.prepare('SELECT MAX(sort_key) as max FROM tasks WHERE list_id = ?')
    .get(listId) as { max: number | null };
  const sortKey = (maxKey.max ?? 0) + 1;
  const now = Date.now();
  db.prepare('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, listId, title, sortKey, now, now);
  return { id, list_id: listId, title, sort_key: sortKey, created_at: now, updated_at: now };
}

export function updateTask(id: string, title: string): void {
  getDb().prepare('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, Date.now(), id);
}

export function deleteTask(id: string): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

export function reorderTask(id: string, newSortKey: number): void {
  getDb().prepare('UPDATE tasks SET sort_key = ?, updated_at = ? WHERE id = ?')
    .run(newSortKey, Date.now(), id);
}

export function moveTask(id: string, newListId: string): void {
  const db = getDb();
  const maxKey = db.prepare('SELECT MAX(sort_key) as max FROM tasks WHERE list_id = ?')
    .get(newListId) as { max: number | null };
  const sortKey = (maxKey.max ?? 0) + 1;
  db.prepare('UPDATE tasks SET list_id = ?, sort_key = ?, updated_at = ? WHERE id = ?')
    .run(newListId, sortKey, Date.now(), id);
}
