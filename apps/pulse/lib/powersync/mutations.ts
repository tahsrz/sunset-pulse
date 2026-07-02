import type { PowerSyncDatabase } from '@powersync/web';

const MAX_PROPERTY_ID_LENGTH = 200;
const MAX_SAVED_SEARCH_NAME_LENGTH = 120;
const MAX_SAVED_SEARCH_CRITERIA_BYTES = 16_384;

function assertPropertyId(propertyId: string) {
  if (!propertyId || propertyId.length > MAX_PROPERTY_ID_LENGTH) {
    throw new Error(`Property ID must be between 1 and ${MAX_PROPERTY_ID_LENGTH} characters.`);
  }
}

export async function toggleLocalCollection(database: PowerSyncDatabase, userId: string, propertyId: string) {
  assertPropertyId(propertyId);
  const existing = await database.getOptional<{ id: string }>(
    'SELECT id FROM collections WHERE user_id = ? AND property_id = ? LIMIT 1',
    [userId, propertyId]
  );

  if (existing) {
    await database.execute('DELETE FROM collections WHERE id = ?', [existing.id]);
    return false;
  }

  await database.execute(
    'INSERT INTO collections (id, user_id, property_id, name, created_at) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), userId, propertyId, 'My Pulse Folder', new Date().toISOString()]
  );
  return true;
}

export async function recordLocalPropertyView(database: PowerSyncDatabase, userId: string, propertyId: string) {
  assertPropertyId(propertyId);
  const existing = await database.getOptional<{ id: string }>(
    'SELECT id FROM recent_property_views WHERE user_id = ? AND property_id = ? LIMIT 1',
    [userId, propertyId]
  );
  const viewedAt = new Date().toISOString();

  if (existing) {
    await database.execute('UPDATE recent_property_views SET viewed_at = ? WHERE id = ?', [viewedAt, existing.id]);
  } else {
    await database.execute(
      'INSERT INTO recent_property_views (id, user_id, property_id, viewed_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, propertyId, viewedAt]
    );
  }

  await pruneLocalPropertyViews(database, userId);
}

export async function pruneLocalPropertyViews(database: PowerSyncDatabase, userId: string) {
  const configuredDays = Number(process.env.NEXT_PUBLIC_RECENT_VIEW_RETENTION_DAYS || 30);
  const retentionDays = Math.max(1, Math.min(Number.isFinite(configuredDays) ? configuredDays : 30, 90));
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1_000).toISOString();
  await database.execute(
    'DELETE FROM recent_property_views WHERE user_id = ? AND viewed_at < ?',
    [userId, cutoff]
  );
  await database.execute(
    `DELETE FROM recent_property_views
     WHERE user_id = ? AND id NOT IN (
       SELECT id FROM recent_property_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 500
     )`,
    [userId, userId]
  );
}

export async function saveLocalSearch(
  database: PowerSyncDatabase,
  userId: string,
  input: { name: string; criteria: Record<string, unknown> }
) {
  const name = input.name.trim();
  if (!name || name.length > MAX_SAVED_SEARCH_NAME_LENGTH) {
    throw new Error(`Saved search name must be between 1 and ${MAX_SAVED_SEARCH_NAME_LENGTH} characters.`);
  }

  const criteria = JSON.stringify(input.criteria);
  if (!criteria || new TextEncoder().encode(criteria).byteLength > MAX_SAVED_SEARCH_CRITERIA_BYTES) {
    throw new Error(`Saved search criteria must not exceed ${MAX_SAVED_SEARCH_CRITERIA_BYTES} bytes.`);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await database.execute(
    `INSERT INTO saved_searches (id, user_id, name, criteria, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, name, criteria, now, now]
  );
  return id;
}
