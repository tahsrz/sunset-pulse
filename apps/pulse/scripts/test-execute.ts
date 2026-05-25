import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const url = process.env.PROD_DATABASE_URL || 'postgres://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('🔗 Connected to DB. Querying cross-schema constraint definitions...');
    
    const query = `
      SELECT
          con.conname AS constraint_name,
          con.conrelid::regclass::text AS referencing_table,
          pg_get_constraintdef(con.oid) AS constraint_definition
      FROM
          pg_constraint con
          JOIN pg_class c_ref ON con.conrelid = c_ref.oid
          JOIN pg_namespace ns_ref ON c_ref.relnamespace = ns_ref.oid
          JOIN pg_class c_f ON con.confrelid = c_f.oid
          JOIN pg_namespace ns_f ON c_f.relnamespace = ns_f.oid
      WHERE
          con.contype = 'f'
          AND ns_ref.nspname = 'public'
          AND ns_f.nspname <> 'public';
    `;
    
    const res = await client.query(query);
    console.log('✅ Query results:');
    res.rows.forEach(r => {
      console.log(`Table: ${r.referencing_table} | Name: ${r.constraint_name} | DDL: ${r.constraint_definition}`);
    });
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
