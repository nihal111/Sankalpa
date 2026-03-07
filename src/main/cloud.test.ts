import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database } from 'sql.js';

const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

vi.mock('./db/schema', () => ({
  initSchema: vi.fn(),
}));

import { testConnection, syncToCloud, restoreFromCloud } from './cloud';

function mockQuery(returnValue: { data?: unknown[]; error?: { message: string } }): void {
  mockFrom.mockReturnValueOnce({
    select: () => ({ limit: () => Promise.resolve(returnValue), then: (fn: (v: unknown) => void) => Promise.resolve(returnValue).then(fn) }),
    delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
    insert: () => Promise.resolve({ error: null }),
  });
}

function mockTable(data: unknown[]): void {
  mockFrom.mockReturnValueOnce({
    select: () => Promise.resolve({ data, error: null }),
    delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
    insert: () => Promise.resolve({ error: null }),
  });
}

describe('cloud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testConnection', () => {
    it('returns success on valid connection', async () => {
      mockQuery({ data: [], error: undefined });
      const result = await testConnection('https://x.supabase.co', 'key');
      expect(result).toEqual({ success: true, message: 'Connected' });
    });

    it('returns error message on failure', async () => {
      mockQuery({ error: { message: 'Invalid API key' } });
      const result = await testConnection('https://x.supabase.co', 'bad');
      expect(result).toEqual({ success: false, message: 'Invalid API key' });
    });

    it('catches thrown exceptions', async () => {
      mockFrom.mockImplementationOnce(() => { throw new Error('network down'); });
      const result = await testConnection('https://x.supabase.co', 'key');
      expect(result).toEqual({ success: false, message: 'network down' });
    });
  });

  describe('syncToCloud', () => {
    it('syncs tables and returns summary', async () => {
      const db = {
        exec: vi.fn((sql: string) => {
          if (sql === 'SELECT * FROM folders') return [{ columns: ['id', 'name'], values: [['f1', 'Work']] }];
          if (sql === 'SELECT * FROM lists') return [{ columns: ['id', 'name'], values: [['l1', 'Tasks']] }];
          if (sql === 'SELECT * FROM tasks') return [{ columns: ['id', 'name', 'list_id'], values: [['t1', 'Do it', 'l1']] }];
          if (sql === 'SELECT id FROM lists') return [{ columns: ['id'], values: [['l1']] }];
          if (sql === 'SELECT * FROM settings') return [];
          return [];
        }),
      } as unknown as Database;

      // 4 deletes (reverse order) + 3 inserts
      for (let i = 0; i < 7; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
          insert: () => Promise.resolve({ error: null }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
      expect(result.message).toContain('1 folders');
      expect(result.message).toContain('1 lists');
      expect(result.message).toContain('1 tasks');
    });

    it('filters orphaned tasks and keeps inbox tasks with null list_id', async () => {
      const db = {
        exec: vi.fn((sql: string) => {
          if (sql === 'SELECT * FROM folders') return [];
          if (sql === 'SELECT * FROM lists') return [{ columns: ['id', 'name'], values: [['l1', 'Tasks']] }];
          if (sql === 'SELECT * FROM tasks') return [{ columns: ['id', 'list_id'], values: [['t1', 'l1'], ['t2', null], ['t3', 'deleted-list']] }];
          if (sql === 'SELECT id FROM lists') return [{ columns: ['id'], values: [['l1']] }];
          if (sql === 'SELECT * FROM settings') return [];
          return [];
        }),
      } as unknown as Database;

      // 4 deletes + 2 inserts (lists + tasks)
      const insertedRows: Record<string, unknown>[] = [];
      for (let i = 0; i < 6; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
          insert: (rows: unknown[]) => { insertedRows.push(...(rows as Record<string, unknown>[])); return Promise.resolve({ error: null }); },
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
      // t1 (valid list) and t2 (null list_id = inbox) kept, t3 (orphaned) filtered
      expect(result.message).toContain('2 tasks');
    });
    it('returns error when insert fails', async () => {
      const db = {
        exec: vi.fn(() => [{ columns: ['id'], values: [['f1']] }]),
      } as unknown as Database;

      // 4 deletes succeed
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }
      // First insert fails
      mockFrom.mockReturnValueOnce({
        insert: () => Promise.resolve({ error: { message: 'insert failed' } }),
      });

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result).toEqual({ success: false, message: 'Failed to insert folders: insert failed' });
    });

    it('falls back to delete by key when delete by id fails', async () => {
      const db = {
        exec: vi.fn(() => []),
      } as unknown as Database;

      // First table (settings, reverse order): id-delete fails, key-delete succeeds
      const deleteByIdFails = { gte: () => Promise.resolve({ error: { message: 'no id' } }) };
      const deleteByKeyOk = { gte: () => Promise.resolve({ error: null }) };
      mockFrom.mockReturnValueOnce({ delete: vi.fn().mockReturnValueOnce(deleteByIdFails) });
      mockFrom.mockReturnValueOnce({ delete: vi.fn().mockReturnValueOnce(deleteByKeyOk) });
      // Remaining 3 tables succeed normally
      for (let i = 0; i < 3; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
    });

    it('returns error when both delete attempts fail', async () => {
      const db = {
        exec: vi.fn(() => []),
      } as unknown as Database;

      const deleteByIdFails = { gte: () => Promise.resolve({ error: { message: 'no id' } }) };
      const deleteByKeyFails = { gte: () => Promise.resolve({ error: { message: 'no key either' } }) };
      mockFrom.mockReturnValueOnce({ delete: vi.fn().mockReturnValueOnce(deleteByIdFails) });
      mockFrom.mockReturnValueOnce({ delete: vi.fn().mockReturnValueOnce(deleteByKeyFails) });

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result).toEqual({ success: false, message: 'Failed to clear settings: no key either' });
    });
  });

  describe('restoreFromCloud', () => {
    it('restores tables into a new database', async () => {
      const mockDb = {
        run: vi.fn(),
        export: vi.fn(() => new Uint8Array([1, 2, 3])),
        close: vi.fn(),
      };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      mockTable([{ id: 'f1', name: 'Work' }]);   // folders
      mockTable([{ id: 'l1', name: 'Tasks' }]);   // lists
      mockTable([{ id: 't1', name: 'Do it' }]);   // tasks
      mockTable([{ key: 'theme', value: 'dark' }]); // settings

      const { result, exportedDb } = await restoreFromCloud(SQL, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
      expect(result.message).toContain('1 folders');
      expect(exportedDb).toEqual(new Uint8Array([1, 2, 3]));
      expect(mockDb.run).toHaveBeenCalledTimes(4);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('returns error when fetch fails', async () => {
      const mockDb = { run: vi.fn(), export: vi.fn(), close: vi.fn() };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      mockFrom.mockReturnValueOnce({
        select: () => Promise.resolve({ data: null, error: { message: 'network error' } }),
      });

      const { result } = await restoreFromCloud(SQL, 'https://x.supabase.co', 'key');
      expect(result).toEqual({ success: false, message: 'folders: network error' });
    });

    it('returns Cloud is empty when all tables are empty', async () => {
      const mockDb = {
        run: vi.fn(),
        export: vi.fn(() => new Uint8Array([0])),
        close: vi.fn(),
      };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      for (let i = 0; i < 4; i++) {
        mockTable([]);
      }

      const { result } = await restoreFromCloud(SQL, 'https://x.supabase.co', 'key');
      expect(result).toEqual({ success: true, message: 'Cloud is empty' });
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });
});
