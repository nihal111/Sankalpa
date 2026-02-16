import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { initSchema, seed } from './schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'sankalpa.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
    seed(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
