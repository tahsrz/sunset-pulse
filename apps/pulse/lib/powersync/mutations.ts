import type { PowerSyncDatabase } from '@powersync/web';

export async function toggleLocalCollection(database: PowerSyncDatabase, userId: string, propertyId: string) {
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
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await database.execute(
    `INSERT INTO saved_searches (id, user_id, name, criteria, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, input.name, JSON.stringify(input.criteria), now, now]
  );
  return id;
}
