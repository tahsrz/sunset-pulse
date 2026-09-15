'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Box, RefreshCw, ShieldCheck } from 'lucide-react';
import PropertyScanPreview from '@/components/scans/PropertyScanPreview';

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

  return <main className="min-h-screen bg-[#07131f] px-6 py-10 text-white"><div className="mx-auto max-w-7xl"><Link href="/admin/property-scans" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-teal-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Scan review queue</Link>{loading ? <div className="mt-12 flex items-center gap-3 text-sm text-teal-100"><RefreshCw className="h-4 w-4 animate-spin" /> Loading preview…</div> : error ? <div className="mt-12 rounded-2xl border border-rose-200/30 bg-rose-200/10 p-5 text-rose-100">{error}</div> : !session?.reconstruction ? <div className="mt-12 rounded-3xl border border-dashed border-white/15 p-10 text-center text-slate-400">This approved session has no reconstruction preview yet.</div> : <><div className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-teal-100"><Box className="h-4 w-4" /> 3D listing preview</div><h1 className="mt-4 text-4xl font-black uppercase italic tracking-tighter md:text-6xl">{session.propertyAddress}</h1><p className="mt-3 text-sm text-slate-400">{session.captureMode.replace('_', ' ')} · {session.reconstruction.assetCount} captures · {session.reconstruction.roomCount} room shells</p></div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-100"><ShieldCheck className="h-4 w-4" /> Approved capture</div></div><div className="mt-8"><PropertyScanPreview roomCount={session.reconstruction.roomCount} /></div><div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-5 text-sm leading-7 text-amber-50"><strong>Preview boundary:</strong> This is a navigable manifest-based room shell for listing review. It is not a measured floor plan and is not yet the final photogrammetry output.</div></>}</div></main>;
}

