import Database from 'better-sqlite3';

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

export function getAllLists(db: Database.Database): List[] {
  return db.prepare('SELECT * FROM lists ORDER BY sort_key').all() as List[];
}

export function createList(db: Database.Database, id: string, name: string): List {
  const maxKey = db.prepare('SELECT MAX(sort_key) as max FROM lists').get() as { max: number | null };
  const sortKey = (maxKey.max ?? 0) + 1;
  const now = Date.now();
  db.prepare('INSERT INTO lists (id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, sortKey, now, now);
  return { id, name, sort_key: sortKey, created_at: now, updated_at: now };
}

export function updateList(db: Database.Database, id: string, name: string): void {
  db.prepare('UPDATE lists SET name = ?, updated_at = ? WHERE id = ?')
    .run(name, Date.now(), id);
}

export function deleteList(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM tasks WHERE list_id = ?').run(id);
  db.prepare('DELETE FROM lists WHERE id = ?').run(id);
}

export function reorderList(db: Database.Database, id: string, newSortKey: number): void {
  db.prepare('UPDATE lists SET sort_key = ?, updated_at = ? WHERE id = ?')
    .run(newSortKey, Date.now(), id);
}

// Tasks

export function getTasksByList(db: Database.Database, listId: string): Task[] {
  return db.prepare('SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_key')
    .all(listId) as Task[];
}

export function createTask(db: Database.Database, id: string, listId: string, title: string): Task {
  const maxKey = db.prepare('SELECT MAX(sort_key) as max FROM tasks WHERE list_id = ?')
    .get(listId) as { max: number | null };
  const sortKey = (maxKey.max ?? 0) + 1;
  const now = Date.now();
  db.prepare('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, listId, title, sortKey, now, now);
  return { id, list_id: listId, title, sort_key: sortKey, created_at: now, updated_at: now };
}

export function updateTask(db: Database.Database, id: string, title: string): void {
  db.prepare('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, Date.now(), id);
}

export function deleteTask(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

export function reorderTask(db: Database.Database, id: string, newSortKey: number): void {
  db.prepare('UPDATE tasks SET sort_key = ?, updated_at = ? WHERE id = ?')
    .run(newSortKey, Date.now(), id);
}

export function moveTask(db: Database.Database, id: string, newListId: string): void {
  const maxKey = db.prepare('SELECT MAX(sort_key) as max FROM tasks WHERE list_id = ?')
    .get(newListId) as { max: number | null };
  const sortKey = (maxKey.max ?? 0) + 1;
  db.prepare('UPDATE tasks SET list_id = ?, sort_key = ?, updated_at = ? WHERE id = ?')
    .run(newListId, sortKey, Date.now(), id);
}
