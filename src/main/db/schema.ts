import { Database } from 'sql.js';

export function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_key REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_key REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (list_id) REFERENCES lists(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_list_sort ON tasks(list_id, sort_key)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lists_sort ON lists(sort_key)`);
}

export function seed(db: Database): void {
  const result = db.exec('SELECT COUNT(*) as count FROM lists');
  const count = result[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const now = Date.now();

  db.run('INSERT INTO lists (id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['inbox', 'Inbox', 1, now, now]);

  db.run('INSERT INTO lists (id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['first-project', 'First Project', 2, now, now]);

  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['task-1', 'inbox', 'Welcome to Sankalpa', 1, now, now]);

  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['task-2', 'inbox', 'Press Tab to switch panes', 2, now, now]);

  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['task-3', 'first-project', 'Your first task', 1, now, now]);
}
