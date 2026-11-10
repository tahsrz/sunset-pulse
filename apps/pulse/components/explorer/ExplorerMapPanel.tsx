'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { loadExplorerMap } from '@/lib/explorer/loadMap';
import type { PublicListing } from '@/lib/data/publicListingContract';
import type { ExplorerSelection } from '@/lib/explorer/publicSearch';
import { ExplorerMapBoundary, MapUnavailable } from './ExplorerMapBoundary';

export function ExplorerMapPanel({ listings, onSelectionChange, selection }: {
  listings: PublicListing[]; onSelectionChange: (selection: ExplorerSelection | null) => void;
  selection?: ExplorerSelection | null;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState<{ attempt: number; Map: Awaited<ReturnType<typeof loadExplorerMap>>['default'] } | null>(null);
  const unavailable = useCallback(() => setFailed(true), []);
  useEffect(() => {
    let cancelled = false;
    // A new import is attempted on retry, including after a rejected chunk load.
    void loadExplorerMap().then(module => {
      if (!cancelled) setLoaded({ attempt, Map: module.default });
    }).catch(() => { if (!cancelled) unavailable(); });
    return () => { cancelled = true; };
  }, [attempt, unavailable]);
  const retry = () => { setFailed(false); setAttempt(value => value + 1); };
  if (failed) return <MapUnavailable onRetry={retry} />;
  if (!loaded || loaded.attempt !== attempt) return <p role="status" className="p-6 text-white">Loading map…</p>;
  const Map = loaded.Map;
  return <ExplorerMapBoundary key={attempt} onRetry={retry}>
    <Map results={listings} onSelectionChange={onSelectionChange} onUnavailable={unavailable} selection={selection} />
  </ExplorerMapBoundary>;
}
