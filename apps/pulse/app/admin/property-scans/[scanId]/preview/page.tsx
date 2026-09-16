'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

type Session = {
  scanId: string;
  propertyAddress: string;
  captureMode: string;
  status: string;
  assets: Array<{ fileName: string; size: number }>;
  reconstruction: { jobId: string; engine: string; previewKind: string; roomCount: number; assetCount: number } | null;
};

export default function PropertyScanPreviewPage({ params }: { params: Promise<{ scanId: string }> }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void params.then(({ scanId }) => fetch(`/api/admin/property-scans/${scanId}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Unable to load 3D preview.');
        if (!cancelled) setSession(body.data.session);
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Unable to load 3D preview.'); })
      .finally(() => { if (!cancelled) setLoading(false); }));
    return () => { cancelled = true; };
  }, [params]);

  return <main className="min-h-screen bg-[#07131f] px-6 py-10 text-white"><div className="mx-auto max-w-7xl"><Link href="/admin/property-scans" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-teal-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Scan review queue</Link>{loading ? <div className="mt-12 flex items-center gap-3 text-sm text-teal-100"><RefreshCw className="h-4 w-4 animate-spin" /> Loading preview…</div> : error ? <div className="mt-12 rounded-2xl border border-rose-200/30 bg-rose-200/10 p-5 text-rose-100">{error}</div> : !session?.reconstruction ? <div className="mt-12 rounded-3xl border border-dashed border-white/15 p-10 text-center text-slate-400">This approved session has no real reconstruction artifact yet.</div> : <div className="mt-12 max-w-3xl rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-8"><p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200">Legacy synthetic demo</p><h1 className="mt-4 text-3xl font-black uppercase italic tracking-tight">Not a model of {session.propertyAddress}</h1><p className="mt-4 text-sm leading-7 text-amber-50">This record was created by an earlier manifest-only demo. Its room count was inferred from the number of files and does not describe this home. A real reconstruction processor and verified artifact are not available yet.</p><p className="mt-5 text-xs leading-6 text-slate-400">Do not use this metadata for measurements, listings, tours, or property decisions.</p></div>}</div></main>;
}
