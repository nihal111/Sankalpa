import { Database } from 'sql.js';

export function migrateTasksTable(db: Database): void {
  const taskColumns = db.exec('PRAGMA table_info(tasks)')[0]?.values ?? [];
  const taskColumnNames = taskColumns.map((column) => String(column[1]));

  if (!taskColumnNames.includes('status')) {
    db.run("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'");
  }
  if (!taskColumnNames.includes('created_timestamp')) {
    db.run('ALTER TABLE tasks ADD COLUMN created_timestamp INTEGER');
    db.run('UPDATE tasks SET created_timestamp = created_at WHERE created_timestamp IS NULL');
    db.run('UPDATE tasks SET created_timestamp = ? WHERE created_timestamp IS NULL', [Date.now()]);
  }
  if (!taskColumnNames.includes('completed_timestamp')) {
    db.run('ALTER TABLE tasks ADD COLUMN completed_timestamp INTEGER');
  }
  if (!taskColumnNames.includes('due_date')) {
    db.run('ALTER TABLE tasks ADD COLUMN due_date INTEGER');
  }
  if (!taskColumnNames.includes('deleted_at')) {
    db.run('ALTER TABLE tasks ADD COLUMN deleted_at INTEGER DEFAULT NULL');
  }
  if (!taskColumnNames.includes('notes')) {
    db.run("ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT NULL");
  }
  if (!taskColumnNames.includes('parent_id')) {
    db.run('ALTER TABLE tasks ADD COLUMN parent_id TEXT REFERENCES tasks(id)');
  }
  if (!taskColumnNames.includes('is_expanded')) {
    db.run('ALTER TABLE tasks ADD COLUMN is_expanded INTEGER NOT NULL DEFAULT 1');
  }

  // Lists migrations
  const listColumns = db.exec('PRAGMA table_info(lists)')[0]?.values ?? [];
  const listColumnNames = listColumns.map((column) => String(column[1]));

  if (!listColumnNames.includes('notes')) {
    db.run("ALTER TABLE lists ADD COLUMN notes TEXT DEFAULT NULL");
  }
}
