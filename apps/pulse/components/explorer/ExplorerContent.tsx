'use client';
import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { PublicListing } from '@/lib/data/publicListingContract';
import { explorerQuery, type ExplorerSelection } from '@/lib/explorer/publicSearch';
import { useExplorerSearch } from '@/hooks/useExplorerSearch';
import { ExplorerMapPanel } from '@/components/explorer/ExplorerMapPanel';
import { ExplorerResultsList } from '@/components/explorer/ExplorerResultsList';

const noListings: PublicListing[] = [];

export function ExplorerContent() {
  const params = useSearchParams();
  const locationKey = params.toString();
  const [area, setArea] = useState<{ key: string; selection: ExplorerSelection | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const selection = area?.key === locationKey ? area.selection : null;
  const query = explorerQuery(params, selection);
  const state = useExplorerSearch(query, attempt);
  const listings = state.status === 'ready' ? state.listings : noListings;
  const onSelectionChange = useCallback((value: ExplorerSelection | null) => {
    setArea({ key: locationKey, selection: value });
  }, [locationKey]);

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl uppercase sm:text-4xl">Property Explorer</h1>
        <Link href="/properties" className="underline underline-offset-4">Browse Properties</Link>
      </header>
      {'error' in query ? <div role="alert" className="space-y-3">
        <p>{query.error}</p>
        <Link href="/explorer" className="underline">Reset Explorer</Link>
        {selection && <button className="ml-4 rounded-lg border px-4 py-2" onClick={() => onSelectionChange(null)}>Clear Area</button>}
      </div> : <>
        <p className="max-w-2xl text-slate-300">Draw an area on the map to search. Properties without map coordinates remain available in the list.</p>
        {selection && <button className="rounded-lg border border-white/30 px-4 py-2" onClick={() => onSelectionChange(null)}>Clear Area</button>}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <section aria-label="Interactive property map" className="relative h-[65vh] min-h-96 overflow-hidden rounded-xl border border-white/15">
            <ExplorerMapPanel listings={listings} onSelectionChange={onSelectionChange} selection={selection} />
          </section>
          <div aria-live="polite" aria-busy={state.status === 'loading'}>
            {state.status === 'loading' && <p role="status">Loading properties…</p>}
            {state.status === 'unavailable' && <div role="alert" className="space-y-4">
              <p>Property search is temporarily unavailable.</p>
              <button className="rounded-lg border px-4 py-2" onClick={() => setAttempt(value => value + 1)}>Retry Search</button>
            </div>}
            {state.status === 'empty' && <p role="status">No properties were returned for this search.</p>}
            {state.status === 'ready' && <ExplorerResultsList listings={state.listings} />}
          </div>
        </div>
      </>}
    </div>
  </main>;
}
