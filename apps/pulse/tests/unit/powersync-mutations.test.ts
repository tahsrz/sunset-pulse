import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordLocalPropertyView, saveLocalSearch, toggleLocalCollection } from '@/lib/powersync/mutations';

describe('PowerSync offline mutations', () => {
  beforeEach(() => vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'local-id') }));

  it('queues a new collection row when a property is not saved', async () => {
    const database = db(null);
    await expect(toggleLocalCollection(database as any, 'user-1', 'property-1')).resolves.toBe(true);
    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO collections'),
      ['local-id', 'user-1', 'property-1', 'My Pulse Folder', expect.any(String)]
    );
  });

  it('deletes an existing collection row locally', async () => {
    const database = db({ id: 'saved-id' });
    await expect(toggleLocalCollection(database as any, 'user-1', 'property-1')).resolves.toBe(false);
    expect(database.execute).toHaveBeenCalledWith('DELETE FROM collections WHERE id = ?', ['saved-id']);
  });

  it('updates recent views and serializes saved-search criteria', async () => {
    const existing = db({ id: 'view-id' });
    await recordLocalPropertyView(existing as any, 'user-1', 'property-1');
    expect(existing.execute).toHaveBeenCalledWith(
      'UPDATE recent_property_views SET viewed_at = ? WHERE id = ?',
      [expect.any(String), 'view-id']
    );
    expect(existing.execute).toHaveBeenCalledWith(
      'DELETE FROM recent_property_views WHERE user_id = ? AND viewed_at < ?',
      ['user-1', expect.any(String)]
    );

    const fresh = db(null);
    await saveLocalSearch(fresh as any, 'user-1', { name: 'Denton homes', criteria: { city: 'Denton' } });
    expect(fresh.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO saved_searches'),
      ['local-id', 'user-1', 'Denton homes', '{"city":"Denton"}', expect.any(String), expect.any(String)]
    );
  });
});

function db(existing: { id: string } | null) {
  return {
    getOptional: vi.fn().mockResolvedValue(existing),
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
  };
}
