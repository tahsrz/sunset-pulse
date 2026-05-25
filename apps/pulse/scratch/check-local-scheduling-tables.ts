import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;
// Local DB URL
const localDbUrl = "postgresql://postgres:postgres@localhost:54322/calendso";

async function main() {
  console.log(`🔌 Checking LOCAL scheduling tables...`);
  const client = new Client({ connectionString: localDbUrl });
  try {
    await client.connect();
    console.log('✅ Connected to LOCAL database!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('User', 'user', 'users', 'Booking', 'VerifiedNumber')
      ORDER BY table_name;
    `);
    
    console.log('\n📅 Existing Tables in Local:', res.rows.map(r => r.table_name));

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
