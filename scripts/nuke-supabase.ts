import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.cloud-sync' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

const TABLES = ['tasks', 'lists', 'folders', 'settings'] as const;

async function nuke(): Promise<void> {
  console.log('⚠️  NUKING SUPABASE - DELETING ALL DATA');
  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().gte('id', '');
    if (error) {
      const { error: err2 } = await supabase.from(table).delete().gte('key', '');
      if (err2) console.log(`  ⚠ ${table}: ${err2.message}`);
      else console.log(`  ✓ Cleared ${table}`);
    } else {
      console.log(`  ✓ Cleared ${table}`);
    }
  }
  console.log('\n✓ Supabase completely nuked!');
}

nuke().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
