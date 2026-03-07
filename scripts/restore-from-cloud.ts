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

// Tables in dependency order
const TABLES = ['folders', 'lists', 'tasks', 'settings'] as const;

async function restore(): Promise<void> {
  console.log('Fetching schema from local app...');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Get schema from the app's own schema init (ensures consistency)
  const { initSchema } = await import('../src/main/db/schema');
  initSchema(db);

  console.log('Fetching data from Supabase...');
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.warn(`  Warning: ${table}: ${error.message}`);
      continue;
    }
    if (!data || data.length === 0) {
      console.log(`  ✓ ${table}: 0 rows`);
      continue;
    }

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(',');
    const verb = table === 'settings' ? 'INSERT OR REPLACE' : 'INSERT';
    const sql = `${verb} INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

    for (const row of data) {
      db.run(sql, columns.map(col => row[col]));
    }

    console.log(`  ✓ ${table}: ${data.length} rows`);
  }

  console.log('Saving to disk...');
  const exported = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(exported));

  console.log(`\n✓ Restore complete! Database saved to ${DB_PATH}`);
  console.log('The app will automatically reload if running.');
}

restore().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
