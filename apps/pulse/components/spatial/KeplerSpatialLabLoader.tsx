'use client';

import dynamic from 'next/dynamic';

const KeplerSpatialLab = dynamic(() => import('./KeplerSpatialLab'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-sm font-bold text-slate-200">
      Loading spatial lab...
    </main>
  )
});

export default function KeplerSpatialLabLoader() {
  return <KeplerSpatialLab />;
}
