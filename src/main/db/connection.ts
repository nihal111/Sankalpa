import initSqlJs, { Database } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { initSchema, seed } from './schema';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    const SQL = await initSqlJs();
    const dbPath = path.join(app.getPath('userData'), 'sankalpa.db');
    
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    initSchema(db);
    seed(db);
    saveDb();
  }
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const dbPath = path.join(app.getPath('userData'), 'sankalpa.db');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}
