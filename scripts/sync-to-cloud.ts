import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.cloud-sync' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

const DB_PATH = path.join(
  process.env.HOME!,
  'Library/Application Support/Sankalpa/sankalpa.db'
);

// Tables in dependency order (children last for insert, first for delete)
const TABLES = ['folders', 'lists', 'tasks', 'settings'] as const;

async function sync(): Promise<void> {
  console.log('Reading local database...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Clear cloud in reverse dependency order
  console.log('Clearing cloud data...');
  for (const table of [...TABLES].reverse()) {
    const { error } = await supabase.from(table).delete().gte('id', '');
    // settings uses 'key' not 'id'
    if (error) {
      const { error: err2 } = await supabase.from(table).delete().gte('key', '');
      if (err2) console.warn(`  Warning: could not clear ${table}: ${err2.message}`);
      else console.log(`  ✓ Cleared ${table}`);
    } else {
      console.log(`  ✓ Cleared ${table}`);
    }
  }

  // Upload each table
  console.log('Uploading data...');
  for (const table of TABLES) {
    const result = db.exec(`SELECT * FROM ${table}`);
    if (!result[0] || result[0].values.length === 0) {
      console.log(`  ✓ ${table}: 0 rows (empty)`);
      continue;
    }

    const columns = result[0].columns;
    const rows = result[0].values.map(row =>
      Object.fromEntries(columns.map((col, i) => [col, row[i]]))
    );

    // Filter orphaned tasks (list_id references non-existent list)
    let filtered = rows;
    if (table === 'tasks') {
      const listResult = db.exec('SELECT id FROM lists');
      const listIds = new Set(listResult[0]?.values.map(r => r[0]) ?? []);
      filtered = rows.filter(r => r.list_id === null || listIds.has(r.list_id));
      if (filtered.length < rows.length) {
        console.log(`  ⚠ Filtered ${rows.length - filtered.length} orphaned tasks`);
      }
    }

    // Batch insert (Supabase limit ~1000 rows per request)
    for (let i = 0; i < filtered.length; i += 500) {
      const batch = filtered.slice(i, i + 500);
      const { error } = await supabase.from(table).insert(batch);
      if (error) throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }

    console.log(`  ✓ ${table}: ${filtered.length} rows`);
  }

  console.log('\n✓ Sync complete!');
}

sync().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
