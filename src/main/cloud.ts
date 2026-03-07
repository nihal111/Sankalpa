import { createClient } from '@supabase/supabase-js';
import { Database } from 'sql.js';
import { initSchema } from './db/schema';

const TABLES = ['folders', 'lists', 'tasks', 'settings'] as const;

interface CloudResult {
  success: boolean;
  message: string;
}

function makeClient(url: string, key: string): ReturnType<typeof createClient> {
  return createClient(url, key);
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

export async function syncToCloud(db: Database, url: string, key: string): Promise<CloudResult> {
  const client = makeClient(url, key);

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
  SQL: { Database: new () => Database },
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
      db.run(sql, columns.map(col => row[col]));
    }

    if (summary) summary += ', ';
    summary += `${data.length} ${table}`;
  }

  const exported = db.export();
  db.close();
  return { result: { success: true, message: summary || 'Cloud is empty' }, exportedDb: exported };
}
