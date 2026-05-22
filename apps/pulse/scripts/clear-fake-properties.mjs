import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apply = process.argv.includes('--apply');
const keepMls = process.argv.includes('--keep-mls');
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

const client = new MongoClient(mongoUri);

try {
  await client.connect();
  const db = client.db();
  const properties = db.collection('properties');
  const leads = db.collection('leads');

  const filter = keepMls ? { source: { $ne: 'MLS' } } : {};
  const docs = await properties.find(filter, { projection: { _id: 1, name: 1, source: 1, is_demo: 1 } }).toArray();
  const ids = docs.map((doc) => doc._id);

  console.log(`${apply ? 'Deleting' : 'Would delete'} ${docs.length} fake properties${keepMls ? ' (keeping MLS records)' : ''}.`);
  docs.slice(0, 10).forEach((doc) => {
    console.log(`- ${doc._id} | ${doc.source || 'Internal'} | ${doc.name}`);
  });
  if (docs.length > 10) {
    console.log(`...and ${docs.length - 10} more.`);
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to delete.');
    process.exit(0);
  }

  const leadFilter = {
    $or: [
      { property: { $in: ids } },
      { property: { $in: ids.map((id) => id.toString()) } },
      { propertyId: { $in: ids.map((id) => id.toString()) } },
    ],
  };

  const propertyResult = await properties.deleteMany(filter);
  const leadResult = ids.every((id) => id instanceof ObjectId)
    ? await leads.deleteMany(leadFilter)
    : { deletedCount: 0 };

  console.log(`Deleted ${propertyResult.deletedCount} properties.`);
  console.log(`Deleted ${leadResult.deletedCount} linked leads.`);
} finally {
  await client.close();
}
