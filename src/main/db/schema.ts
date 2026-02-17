import { Database } from 'sql.js';

export function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_key REAL NOT NULL,
      is_expanded INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      folder_id TEXT,
      name TEXT NOT NULL,
      sort_key REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT,
      title TEXT NOT NULL,
      sort_key REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (list_id) REFERENCES lists(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_folders_sort ON folders(sort_key)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lists_folder ON lists(folder_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_list_sort ON tasks(list_id, sort_key)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lists_sort ON lists(sort_key)`);
}

export function seed(db: Database): void {
  const result = db.exec('SELECT COUNT(*) as count FROM lists');
  const count = result[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const now = Date.now();

  // Create a sample folder
  db.run('INSERT INTO folders (id, name, sort_key, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['folder-1', 'Projects', 1, 1, now, now]);

  // Tutorial at top level
  db.run('INSERT INTO lists (id, folder_id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['tutorial', null, 'Tutorial', 1, now, now]);

  // First Project inside folder
  db.run('INSERT INTO lists (id, folder_id, name, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['first-project', 'folder-1', 'First Project', 1, now, now]);

  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['task-1', 'tutorial', 'Welcome to Sankalpa', 1, now, now]);

  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['task-2', 'tutorial', 'Press Tab to switch panes', 2, now, now]);

  db.run('INSERT INTO tasks (id, list_id, title, sort_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['task-3', 'first-project', 'Your first task', 1, now, now]);
}
