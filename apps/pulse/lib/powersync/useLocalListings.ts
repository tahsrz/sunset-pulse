'use client';

import { useEffect, useMemo, useState } from 'react';
import { normalizeListing, type Listing } from '@/lib/data/listingContract';
import { sunsetSyncStreams, type LocalPropertyRow } from './schema';
import { useSunsetPowerSync } from './PowerSyncProvider';

export type ViewportBounds = { north: number; south: number; east: number; west: number };

export function useLocalViewportListings(bounds: ViewportBounds | null) {
  const { database, enabled, connected } = useSunsetPowerSync();
  const [rows, setRows] = useState<LocalPropertyRow[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!database || !bounds) return;
    const controller = new AbortController();

    async function watchRows() {
      try {
        for await (const result of database.watch(
          `SELECT * FROM properties
           WHERE latitude BETWEEN ? AND ?
             AND longitude BETWEEN ? AND ?
             AND display_public = 1
             AND is_demo = 0`,
          [bounds.south, bounds.north, bounds.west, bounds.east],
          { signal: controller.signal }
        )) {
          setRows((result.rows?._array || []) as LocalPropertyRow[]);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(asError(reason));
      }
    }
    watchRows();
    return () => controller.abort();
  }, [bounds, database]);

  useEffect(() => {
    if (!database || !connected || !bounds) return;
    let subscription: { unsubscribe(): void } | null = null;
    let cancelled = false;

    sunsetSyncStreams(database).viewport(bounds).subscribe({ ttl: 300 })
      .then((result) => {
        if (cancelled) result.unsubscribe();
        else subscription = result;
      })
      .catch((reason) => {
        if (!cancelled) setError(asError(reason));
      });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [bounds, connected, database]);

  const listings = useMemo(
    () => rows.map((row) => normalizeListing(row as Record<string, any>)),
    [rows]
  );

  return { listings, enabled, connected, error };
}

export function useLocalListing(propertyId: string | null) {
  const { database, enabled, connected } = useSunsetPowerSync();
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!database || !propertyId) return;
    const controller = new AbortController();

    async function watchListing() {
      for await (const result of database.watch(
        'SELECT * FROM properties WHERE id = ? OR mls_id = ? LIMIT 1',
        [propertyId, propertyId],
        { signal: controller.signal }
      )) {
        const row = result.rows?._array?.[0] as Record<string, any> | undefined;
        setListing(row ? normalizeListing(row) : null);
      }
    }
    watchListing().catch(() => {});
    return () => controller.abort();
  }, [database, propertyId]);

  useEffect(() => {
    if (!database || !connected || !propertyId) return;
    let cancelled = false;
    let subscription: { unsubscribe(): void } | null = null;
    sunsetSyncStreams(database).propertyDetail(propertyId).subscribe({ ttl: 3600 })
      .then((result) => cancelled ? result.unsubscribe() : subscription = result)
      .catch(() => {});
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [connected, database, propertyId]);

  return { listing, enabled, connected };
}

function asError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}
