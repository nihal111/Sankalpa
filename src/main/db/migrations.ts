import { Database } from 'sql.js';

export function migrateTasksTable(db: Database): void {
  const columns = db.exec('PRAGMA table_info(tasks)')[0]?.values ?? [];
  const columnNames = columns.map((column) => String(column[1]));

  if (!columnNames.includes('status')) {
    db.run("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'");
  }
  if (!columnNames.includes('created_timestamp')) {
    db.run('ALTER TABLE tasks ADD COLUMN created_timestamp INTEGER');
    db.run('UPDATE tasks SET created_timestamp = created_at WHERE created_timestamp IS NULL');
    db.run('UPDATE tasks SET created_timestamp = ? WHERE created_timestamp IS NULL', [Date.now()]);
  }
  if (!columnNames.includes('completed_timestamp')) {
    db.run('ALTER TABLE tasks ADD COLUMN completed_timestamp INTEGER');
  }
  if (!columnNames.includes('due_date')) {
    db.run('ALTER TABLE tasks ADD COLUMN due_date INTEGER');
  }
}
