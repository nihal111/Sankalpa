import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import { initSchema } from './db/schema';

const TABLES = ['folders', 'lists', 'tasks', 'settings'] as const;
const GFS_LIMITS = { daily: 7, weekly: 4, monthly: 3 } as const;

export interface CloudResult {
  success: boolean;
  message: string;
}

export interface Snapshot {
  id: string;
  tier: string;
  created_at: number;
}

function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function testConnection(url: string, key: string): Promise<CloudResult> {
  try {
    const client = makeClient(url, key);
    const { error } = await client.from('settings').select('key').limit(1);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Connected' };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

function readLocalData(db: SqlJsDatabase): Record<string, Record<string, SqlValue>[]> | null {
  const data: Record<string, Record<string, SqlValue>[]> = {};
  let hasData = false;
  for (const table of TABLES) {
    const result = db.exec(`SELECT * FROM ${table}`);
    if (!result[0] || result[0].values.length === 0) { data[table] = []; continue; }
    const columns = result[0].columns;
    data[table] = result[0].values.map(row =>
      Object.fromEntries(columns.map((col, i) => [col, row[i]])) as Record<string, SqlValue>
    );
    hasData = true;
  }
  return hasData ? data : null;
}

export function getTier(now: Date): 'daily' | 'weekly' | 'monthly' {
  if (now.getDate() === 1) return 'monthly';
  if (now.getDay() === 0) return 'weekly';
  return 'daily';
}

async function rotateSnapshots(client: SupabaseClient): Promise<void> {
  for (const tier of ['daily', 'weekly', 'monthly'] as const) {
    const { data } = await client.from('snapshots').select('id').eq('tier', tier).order('created_at', { ascending: false });
    if (!data || data.length <= GFS_LIMITS[tier]) continue;
    const toDelete = (data as { id: string }[]).slice(GFS_LIMITS[tier]).map(r => r.id);
    await client.from('snapshots').delete().in('id', toDelete);
  }
}

export async function syncToCloud(db: SqlJsDatabase, url: string, key: string): Promise<CloudResult> {
  const client = makeClient(url, key);

  // Snapshot local state being uploaded
  const localData = readLocalData(db);
  if (localData) {
    const now = new Date();
    const tier = getTier(now);
    await client.from('snapshots').insert({
      id: generateId(),
      tier,
      created_at: now.getTime(),
      data: localData,
    } as never);
    await rotateSnapshots(client);
  }

  // Clear cloud in reverse dependency order
  for (const table of [...TABLES].reverse()) {
    const { error } = await client.from(table).delete().gte('id', '');
    if (error) {
      const { error: err2 } = await client.from(table).delete().gte('key', '');
      if (err2) return { success: false, message: `Failed to clear ${table}: ${err2.message}` };
    }
  }

  // Upload each table
  let summary = '';
  for (const table of TABLES) {
    const result = db.exec(`SELECT * FROM ${table}`);
    if (!result[0] || result[0].values.length === 0) continue;

    const columns = result[0].columns;
    let rows: Record<string, unknown>[] = result[0].values.map(row =>
      Object.fromEntries(columns.map((col, i) => [col, row[i]]))
    );

    // Filter orphaned tasks
    if (table === 'tasks') {
      const listResult = db.exec('SELECT id FROM lists');
      const listIds = new Set(listResult[0]?.values.map(r => r[0]) ?? []);
      rows = rows.filter(r => r.list_id === null || listIds.has(r.list_id as string));
    }

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await client.from(table).insert(rows.slice(i, i + 500) as never[]);
      if (error) return { success: false, message: `Failed to insert ${table}: ${error.message}` };
    }

    if (summary) summary += ', ';
    summary += `${rows.length} ${table}`;
  }

  return { success: true, message: summary || 'No data to sync' };
}

export async function restoreFromCloud(
  SQL: { Database: new () => SqlJsDatabase },
  url: string,
  key: string,
): Promise<{ result: CloudResult; exportedDb?: Uint8Array }> {
  const client = makeClient(url, key);
  const db = new SQL.Database();
  initSchema(db);

  let summary = '';
  for (const table of TABLES) {
    const { data, error } = await client.from(table).select('*');
    if (error) return { result: { success: false, message: `${table}: ${error.message}` } };
    if (!data || data.length === 0) continue;

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(',');
    const verb = table === 'settings' ? 'INSERT OR REPLACE' : 'INSERT';
    const sql = `${verb} INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

    for (const row of data) {
      db.run(sql, columns.map(col => (row as Record<string, SqlValue>)[col]));
    }

    if (summary) summary += ', ';
    summary += `${data.length} ${table}`;
  }

  const exported = db.export();
  db.close();
  return { result: { success: true, message: summary || 'Cloud is empty' }, exportedDb: exported };
}

export async function listSnapshots(url: string, key: string): Promise<{ result: CloudResult; snapshots: Snapshot[] }> {
  const client = makeClient(url, key);
  const { data, error } = await client.from('snapshots').select('id, tier, created_at').order('created_at', { ascending: false });
  if (error) return { result: { success: false, message: error.message }, snapshots: [] };
  const list = data ?? [];
  return { result: { success: true, message: `${list.length} backups` }, snapshots: list };
}

export async function restoreFromSnapshot(
  SQL: { Database: new () => SqlJsDatabase },
  url: string,
  key: string,
  snapshotId: string,
): Promise<{ result: CloudResult; exportedDb?: Uint8Array }> {
  const client = makeClient(url, key);
  const { data, error } = await client.from('snapshots').select('data').eq('id', snapshotId).single();
  if (error || !data) return { result: { success: false, message: error?.message ?? 'Snapshot not found' } };

  const snapshotData = (data as Record<string, unknown>).data as Record<string, Record<string, SqlValue>[]>;
  const db = new SQL.Database();
  initSchema(db);

  let summary = '';
  for (const table of TABLES) {
    const rows = snapshotData[table];
    if (!rows || rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(',');
    const verb = table === 'settings' ? 'INSERT OR REPLACE' : 'INSERT';
    const sql = `${verb} INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

    for (const row of rows) {
      db.run(sql, columns.map(col => row[col]));
    }

    if (summary) summary += ', ';
    summary += `${rows.length} ${table}`;
  }

  const exported = db.export();
  db.close();
  return { result: { success: true, message: summary || 'Snapshot was empty' }, exportedDb: exported };
}
