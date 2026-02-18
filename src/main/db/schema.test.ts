import initSqlJs from 'sql.js';
import { describe, it, expect, beforeAll } from 'vitest';
import { initSchema, seed } from './schema';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

beforeAll(async () => {
  SQL = await initSqlJs();
});

describe('schema', () => {
  it('creates tables', () => {
    const db = new SQL.Database();
    initSchema(db);

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const names = tables[0].values.map(r => r[0]);
    expect(names).toContain('folders');
    expect(names).toContain('lists');
    expect(names).toContain('tasks');
    db.close();
  });

  it('seeds default data', () => {
    const db = new SQL.Database();
    initSchema(db);
    seed(db);

    const folders = db.exec('SELECT * FROM folders');
    expect(folders[0].values).toHaveLength(1);

    const lists = db.exec('SELECT * FROM lists');
    expect(lists[0].values).toHaveLength(2);

    const tasks = db.exec('SELECT * FROM tasks');
    expect(tasks[0].values).toHaveLength(3);
    db.close();
  });

  it('does not re-seed if data exists', () => {
    const db = new SQL.Database();
    initSchema(db);
    seed(db);
    seed(db);

    const lists = db.exec('SELECT * FROM lists');
    expect(lists[0].values).toHaveLength(2);
    db.close();
  });
});
