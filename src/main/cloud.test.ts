import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database } from 'sql.js';

const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

vi.mock('./db/schema', () => ({
  initSchema: vi.fn(),
}));

import { testConnection, syncToCloud, restoreFromCloud, listSnapshots, restoreFromSnapshot, getTier } from './cloud';

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

  describe('getTier', () => {
    it('returns monthly on 1st of month', () => {
      expect(getTier(new Date(2026, 2, 1))).toBe('monthly'); // March 1
    });
    it('returns weekly on Sunday', () => {
      expect(getTier(new Date(2026, 2, 8))).toBe('weekly'); // March 8 is Sunday
    });
    it('returns daily on regular days', () => {
      expect(getTier(new Date(2026, 2, 7))).toBe('daily'); // March 7 is Saturday
    });
  });

  describe('syncToCloud', () => {
    function mockEmptyCloudRead(): void {
      // readCloudData reads 4 tables — all empty means no snapshot
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          select: () => Promise.resolve({ data: [], error: null }),
        });
      }
    }

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

      // readCloudData: 4 selects (empty cloud = no snapshot)
      mockEmptyCloudRead();
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

    it('creates snapshot of existing cloud data before overwriting', async () => {
      const db = {
        exec: vi.fn(() => []),
      } as unknown as Database;

      // readCloudData: cloud has data
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [{ id: 'f1' }], error: null }) }); // folders
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [], error: null }) }); // lists
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [{ id: 't1' }], error: null }) }); // tasks
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [], error: null }) }); // settings

      // snapshot insert
      const insertedSnapshot: Record<string, unknown>[] = [];
      mockFrom.mockReturnValueOnce({
        insert: (row: Record<string, unknown>) => { insertedSnapshot.push(row); return Promise.resolve({ error: null }); },
      });

      // rotateSnapshots: 3 tiers × select
      for (let i = 0; i < 3; i++) {
        mockFrom.mockReturnValueOnce({
          select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
        });
      }

      // 4 deletes
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
      expect(insertedSnapshot).toHaveLength(1);
      expect(insertedSnapshot[0].data).toEqual({
        folders: [{ id: 'f1' }], lists: [], tasks: [{ id: 't1' }], settings: [],
      });
      expect(insertedSnapshot[0].tier).toBe('daily');
    });

    it('skips snapshot when readCloudData fails', async () => {
      const db = { exec: vi.fn(() => []) } as unknown as Database;

      // readCloudData: first table returns error
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: null, error: { message: 'fail' } }) });

      // No snapshot insert or rotation — goes straight to deletes
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
    });

    it('skips snapshot when cloud has no data (all tables empty)', async () => {
      const db = { exec: vi.fn(() => []) } as unknown as Database;

      // readCloudData: all tables empty
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [], error: null }) });
      }

      // No snapshot — straight to deletes
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
    });

    it('handles null rows from readCloudData gracefully', async () => {
      const db = { exec: vi.fn(() => []) } as unknown as Database;

      // readCloudData: first table returns null data (no error), rest have data
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: null, error: null }) }); // folders: null
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [{ id: 'l1' }], error: null }) }); // lists: has data
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: null, error: null }) }); // tasks: null
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [], error: null }) }); // settings: empty

      // Snapshot insert (hasData=true because lists has data)
      mockFrom.mockReturnValueOnce({ insert: () => Promise.resolve({ error: null }) });

      // rotateSnapshots: 3 tiers
      for (let i = 0; i < 3; i++) {
        mockFrom.mockReturnValueOnce({
          select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
        });
      }

      // 4 deletes
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
    });

    it('rotateSnapshots deletes excess snapshots', async () => {
      const db = { exec: vi.fn(() => []) } as unknown as Database;

      // readCloudData: has data
      mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [{ id: 'f1' }], error: null }) });
      for (let i = 0; i < 3; i++) {
        mockFrom.mockReturnValueOnce({ select: () => Promise.resolve({ data: [], error: null }) });
      }

      // snapshot insert
      mockFrom.mockReturnValueOnce({ insert: () => Promise.resolve({ error: null }) });

      // rotateSnapshots: daily has 8 (limit 7), weekly and monthly under limit
      const deletedIds: string[] = [];
      mockFrom.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: Array.from({ length: 8 }, (_, i) => ({ id: `d${i}` })),
            }),
          }),
        }),
      });
      mockFrom.mockReturnValueOnce({
        delete: () => ({ in: (_: string, ids: string[]) => { deletedIds.push(...ids); return Promise.resolve({ error: null }); } }),
      });
      // weekly: under limit
      mockFrom.mockReturnValueOnce({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ id: 'w1' }] }) }) }),
      });
      // monthly: under limit
      mockFrom.mockReturnValueOnce({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ id: 'm1' }] }) }) }),
      });

      // 4 deletes
      for (let i = 0; i < 4; i++) {
        mockFrom.mockReturnValueOnce({
          delete: () => ({ gte: () => Promise.resolve({ error: null }) }),
        });
      }

      const result = await syncToCloud(db, 'https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
      expect(deletedIds).toEqual(['d7']); // 8th snapshot (index 7) deleted
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

      mockEmptyCloudRead();
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

      mockEmptyCloudRead();
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

      mockEmptyCloudRead();
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

      mockEmptyCloudRead();
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

  describe('listSnapshots', () => {
    it('returns snapshots sorted by created_at desc', async () => {
      const snapshots = [
        { id: 's2', tier: 'daily', created_at: 2000 },
        { id: 's1', tier: 'weekly', created_at: 1000 },
      ];
      mockFrom.mockReturnValueOnce({
        select: () => ({ order: () => Promise.resolve({ data: snapshots, error: null }) }),
      });

      const { result, snapshots: list } = await listSnapshots('https://x.supabase.co', 'key');
      expect(result.success).toBe(true);
      expect(result.message).toBe('2 backups');
      expect(list).toEqual(snapshots);
    });

    it('returns error on failure', async () => {
      mockFrom.mockReturnValueOnce({
        select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'fail' } }) }),
      });

      const { result, snapshots } = await listSnapshots('https://x.supabase.co', 'key');
      expect(result).toEqual({ success: false, message: 'fail' });
      expect(snapshots).toEqual([]);
    });

    it('handles null data without error', async () => {
      mockFrom.mockReturnValueOnce({
        select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }),
      });

      const { result, snapshots } = await listSnapshots('https://x.supabase.co', 'key');
      expect(result).toEqual({ success: true, message: '0 backups' });
      expect(snapshots).toEqual([]);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('restores data from a snapshot into a new database', async () => {
      const mockDb = {
        run: vi.fn(),
        export: vi.fn(() => new Uint8Array([4, 5, 6])),
        close: vi.fn(),
      };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      const snapshotData = {
        folders: [{ id: 'f1', name: 'Work' }],
        lists: [{ id: 'l1', name: 'Tasks' }],
        tasks: [],
        settings: [{ key: 'theme', value: 'dark' }],
      };

      mockFrom.mockReturnValueOnce({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { data: snapshotData }, error: null }) }) }),
      });

      const { result, exportedDb } = await restoreFromSnapshot(SQL, 'https://x.supabase.co', 'key', 's1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('1 folders');
      expect(result.message).toContain('1 lists');
      expect(result.message).toContain('1 settings');
      expect(exportedDb).toEqual(new Uint8Array([4, 5, 6]));
      expect(mockDb.run).toHaveBeenCalledTimes(3); // 1 folder + 1 list + 1 setting (0 tasks)
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('returns error when snapshot not found', async () => {
      const mockDb = { run: vi.fn(), export: vi.fn(), close: vi.fn() };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      mockFrom.mockReturnValueOnce({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
      });

      const { result } = await restoreFromSnapshot(SQL, 'https://x.supabase.co', 'key', 'bad-id');
      expect(result).toEqual({ success: false, message: 'not found' });
    });

    it('returns Snapshot not found when data is null without error', async () => {
      const mockDb = { run: vi.fn(), export: vi.fn(), close: vi.fn() };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      mockFrom.mockReturnValueOnce({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      });

      const { result } = await restoreFromSnapshot(SQL, 'https://x.supabase.co', 'key', 'bad-id');
      expect(result).toEqual({ success: false, message: 'Snapshot not found' });
    });

    it('returns Snapshot was empty for empty snapshot data', async () => {
      const mockDb = {
        run: vi.fn(),
        export: vi.fn(() => new Uint8Array([0])),
        close: vi.fn(),
      };
      const SQL = { Database: vi.fn(() => mockDb) } as unknown as { Database: new () => Database };

      mockFrom.mockReturnValueOnce({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { data: { folders: [], lists: [], tasks: [], settings: [] } }, error: null }) }) }),
      });

      const { result } = await restoreFromSnapshot(SQL, 'https://x.supabase.co', 'key', 's1');
      expect(result).toEqual({ success: true, message: 'Snapshot was empty' });
    });
  });
});
