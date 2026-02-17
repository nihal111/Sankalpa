import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';

// Mock electron and fs before importing connection
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/test-sankalpa') },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

import fs from 'fs';
import { getDb, saveDb, closeDb } from './connection';

describe('connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeDb();
  });

  afterEach(() => {
    closeDb();
  });

  it('creates new database when file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const db = await getDb();

    expect(db).toBeDefined();
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('loads existing database from file', async () => {
    const SQL = await initSqlJs();
    const tempDb = new SQL.Database();
    const buffer = Buffer.from(tempDb.export());
    tempDb.close();

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(buffer);

    const db = await getDb();

    expect(db).toBeDefined();
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('returns same instance on subsequent calls', async () => {
    const db1 = await getDb();
    const db2 = await getDb();

    expect(db1).toBe(db2);
  });

  it('saveDb writes database to file', async () => {
    await getDb();
    saveDb();

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('saveDb does nothing when no db initialized', () => {
    saveDb();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('closeDb saves and closes database', async () => {
    await getDb();
    closeDb();

    expect(fs.writeFileSync).toHaveBeenCalled();

    // After close, getDb should create new instance
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const newDb = await getDb();
    expect(newDb).toBeDefined();
  });
});
