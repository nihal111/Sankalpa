import Database from 'better-sqlite3';
import { describe, it, expect } from 'vitest';
import { initSchema, seed } from './schema';

describe('schema', () => {
  it('creates tables', () => {
    const db = new Database(':memory:');
    initSchema(db);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('lists');
    expect(names).toContain('tasks');
  });

  it('seeds default data', () => {
    const db = new Database(':memory:');
    initSchema(db);
    seed(db);

    const lists = db.prepare('SELECT * FROM lists').all();
    expect(lists).toHaveLength(2);

    const tasks = db.prepare('SELECT * FROM tasks').all();
    expect(tasks).toHaveLength(3);
  });

  it('does not re-seed if data exists', () => {
    const db = new Database(':memory:');
    initSchema(db);
    seed(db);
    seed(db);

    const lists = db.prepare('SELECT * FROM lists').all();
    expect(lists).toHaveLength(2);
  });
});
