import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;
const prodDbUrl = "postgresql://postgres:SunsetPulseCollective@db.xlyfhiafactxahhvikyv.supabase.co:5432/postgres";

async function main() {
  console.log(`🔌 Counting rows in production "users" table...`);
  const client = new Client({ connectionString: prodDbUrl });
  try {
    await client.connect();
    console.log('✅ Connected to PRODUCTION!');

    const res = await client.query('SELECT COUNT(*) FROM "users"');
    console.log('📊 Count:', res.rows[0].count);

    const usersSample = await client.query('SELECT id, email, name, username FROM "users" LIMIT 5');
    console.log('\n👤 Sample Users:', usersSample.rows);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
