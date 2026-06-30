'use client';

import { useCallback, useEffect, useState } from 'react';
import { toggleLocalCollection } from './mutations';
import { useSunsetPowerSync } from './PowerSyncProvider';

export function useLocalCollection(propertyId: string, userId?: string) {
  const { database, enabled } = useSunsetPowerSync();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !database || !userId || !propertyId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);

    async function watchSavedState() {
      for await (const result of database.watch(
        'SELECT id FROM collections WHERE user_id = ? AND property_id = ? LIMIT 1',
        [userId, propertyId],
        { signal: controller.signal }
      )) {
        setIsSaved((result.rows?._array?.length || 0) > 0);
        setLoading(false);
      }
    }

    watchSavedState().catch((error) => {
      if (!controller.signal.aborted) {
        console.error('[POWERSYNC_COLLECTION_WATCH_ERROR]', error);
        setLoading(false);
      }
    });
    return () => controller.abort();
  }, [database, enabled, propertyId, userId]);

  const toggle = useCallback(async () => {
    if (!database || !userId) throw new Error('Local collections are not ready.');
    return toggleLocalCollection(database, userId, propertyId);
  }, [database, propertyId, userId]);

  return { enabled, isSaved, loading, toggle };
}
