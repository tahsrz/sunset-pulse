import pg from 'pg';
const { Client } = pg;

const localConnectionString = "postgresql://postgres:postgres@localhost:54322/postgres";

async function main() {
  console.log(`\n🔌 Querying local leads columns...`);
  const client = new Client({ connectionString: localConnectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log('✅ Connected!');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('📋 Tables in LOCAL public schema:');
    console.log(tables.rows.map(r => r.table_name));

  } catch (err: any) {
    console.error(`❌ Error with LOCAL:`, err.message);
  } finally {
    await client.end();
  }
}

main();
