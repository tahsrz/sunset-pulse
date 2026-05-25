import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;

// Production DB URL using the password from the summary
const prodDbUrl = "postgresql://postgres:SunsetPulseCollective@db.xlyfhiafactxahhvikyv.supabase.co:5432/postgres";

async function main() {
  console.log(`🔌 Attempting to connect to PRODUCTION database...`);
  const client = new Client({ connectionString: prodDbUrl, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    console.log('✅ Connected to PRODUCTION!');

    const targetTables = [
      'leads', 'campaigns', 'campaign_touches', 'lead_campaigns',
      'collections', 'intelligence_events', 'daily_briefings', 'jamie_interactions',
      'profiles', 'properties', 'property_comments', 'scythe_registry',
      'site_config', 'sprints', 'tasks', 'workflows'
    ];

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1)
      ORDER BY table_name;
    `, [targetTables]);

    const existing = tables.rows.map(r => r.table_name);
    console.log('\n🔍 AUDIT RESULTS:');
    for (const table of targetTables) {
      if (existing.includes(table)) {
        console.log(`✅ Table "${table}" EXISTS in production`);
      } else {
        console.log(`❌ Table "${table}" is MISSING in production`);
      }
    }

  } catch (err: any) {
    console.error(`❌ Error with PRODUCTION connection:`, err.message);
  } finally {
    await client.end();
  }
}

main();
