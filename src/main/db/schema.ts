import Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_key REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_key REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (list_id) REFERENCES lists(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_list_sort ON tasks(list_id, sort_key);
    CREATE INDEX IF NOT EXISTS idx_lists_sort ON lists(sort_key);
  `);
}

export function seed(db: Database.Database): void {
  const listCount = db.prepare('SELECT COUNT(*) as count FROM lists').get() as { count: number };
  if (listCount.count > 0) return;

  const now = Date.now();

  db.prepare(`
    INSERT INTO lists (id, name, sort_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('inbox', 'Inbox', 1, now, now);

  db.prepare(`
    INSERT INTO lists (id, name, sort_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('first-project', 'First Project', 2, now, now);

  db.prepare(`
    INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('task-1', 'inbox', 'Welcome to Sankalpa', 1, now, now);

  db.prepare(`
    INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('task-2', 'inbox', 'Press Tab to switch panes', 2, now, now);

  db.prepare(`
    INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('task-3', 'first-project', 'Your first task', 1, now, now);
}
