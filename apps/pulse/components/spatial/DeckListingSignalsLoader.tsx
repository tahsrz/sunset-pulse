'use client';

import dynamic from 'next/dynamic';

const DeckListingSignals = dynamic(() => import('./DeckListingSignals'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-sm font-bold text-slate-200">
      Loading deck signal map...
    </main>
  )
});

export default function DeckListingSignalsLoader() {
  return <DeckListingSignals />;
}
