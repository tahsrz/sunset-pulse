import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(process.cwd(), '../../infra/openresync/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });
dotenv.config({ override: false });

const databaseUrl = required('OPENRESYNC_RAW_DATABASE_URL');
const propertyTable = safeIdentifier(process.env.OPENRESYNC_PROPERTY_TABLE || 'sunset_Property');
const mediaTable = safeIdentifier(process.env.OPENRESYNC_MEDIA_TABLE || 'sunset_Media');
const adminUrl = process.env.OPENRESYNC_ADMIN_URL || 'http://127.0.0.1:4000';

async function main() {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const propertyCount = await countTable(connection, propertyTable);
    const mediaCount = await countTable(connection, mediaTable, true);
    const response = await fetch(adminUrl, { signal: AbortSignal.timeout(5000) });

    console.log(JSON.stringify({
      mysql: 'ready',
      admin: { url: adminUrl, status: response.status, ready: response.ok },
      raw: {
        propertyTable,
        propertyCount,
        mediaTable,
        mediaCount,
      },
    }, null, 2));

    if (!response.ok) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

async function countTable(connection: mysql.Connection, table: string, optional = false) {
  try {
    const [rows] = await connection.query<any[]>(`SELECT COUNT(*) AS count FROM \`${table}\``);
    return Number(rows[0]?.count || 0);
  } catch (error: any) {
    if (optional && error?.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
}

function safeIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Unsafe MySQL identifier: ${value}`);
  return value;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Configure infra/openresync/.env first.`);
  return value;
}

main().catch((error) => {
  console.error('[OPENRESYNC_DOCTOR_FAILED]', error);
  process.exitCode = 1;
});
