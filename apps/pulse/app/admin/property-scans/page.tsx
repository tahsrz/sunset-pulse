'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, RefreshCw, ScanLine, ShieldCheck, XCircle } from 'lucide-react';
import ScanMediaGallery from '@/components/scans/ScanMediaGallery';

type ScanSession = {
  scanId: string;
  propertyAddress: string;
  listingId: string | null;
  listingLinkStatus: 'unresolved' | 'verified';
  captureMode: string;
  status: 'capture_ready' | 'in_review' | 'approved' | 'rejected';
  revision: number;
  manifestHash: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reconstruction: { jobId: string; status: 'ready' | 'failed'; progress: number; engine: string; previewKind: string; roomCount: number; assetCount: number } | null;
  assets: Array<{ assetId?: string; fileName: string; mimeType: string; size: number; capturedAt: string }>;
  consent: { ownerAuthorized: boolean; interiorCaptureAcknowledged: boolean; publicListingApproval: boolean };
  updatedAt: string;
};

export default function PropertyScanReviewPage() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/property-scans', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to load scan review queue.');
      setSessions(body.data.sessions || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load scan review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => ({
    review: sessions.filter((session) => session.status === 'in_review' || session.status === 'capture_ready').length,
    approved: sessions.filter((session) => session.status === 'approved').length,
    rejected: sessions.filter((session) => session.status === 'rejected').length,
  }), [sessions]);

  const review = async (session: ScanSession, status: 'approved' | 'rejected') => {
    setBusyId(session.scanId);
    setError('');
    try {
      const response = await fetch(`/api/admin/property-scans/${session.scanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote: status === 'approved' ? 'Capture approved for 3D reconstruction review.' : 'Capture needs another pass before reconstruction.', expectedRevision: session.revision, expectedManifestHash: session.manifestHash, mediaInspectionAcknowledged: status === 'approved' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to update scan review.');
      setSessions((current) => current.map((item) => item.scanId === session.scanId ? body.data.session : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update scan review.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="min-h-screen bg-[#07131f] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div><Link href="/admin/research-desk" className="text-xs font-black uppercase tracking-[0.25em] text-teal-200 hover:text-white">← Operations</Link><div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-teal-100"><ScanLine className="h-4 w-4" /> Property scan review</div><h1 className="mt-4 text-4xl font-black uppercase italic tracking-tighter md:text-6xl">Inspect the capture before processing.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Review consent and capture metadata. Approval records review intent; a real reconstruction processor is not configured, and approval does not publish the home or alter the MLS record.</p></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-widest hover:border-teal-200/60 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh queue</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label="Needs review" value={counts.review} /><Metric label="Approved" value={counts.approved} /><Metric label="Rejected" value={counts.rejected} /></div>
        {error && <div className="mt-6 rounded-2xl border border-rose-200/30 bg-rose-200/10 p-4 text-sm text-rose-100">{error}</div>}
        {loading ? <div className="mt-8 flex items-center gap-3 text-sm text-teal-100"><RefreshCw className="h-4 w-4 animate-spin" /> Loading private capture sessions…</div> : sessions.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm leading-7 text-slate-400">No property scan sessions have been submitted yet. Start one from <Link href="/scan-studio" className="text-teal-200 underline">Scan Studio</Link>.</div> : <div className="mt-8 grid gap-5 lg:grid-cols-2">{sessions.map((session) => <ScanReviewCard key={session.scanId} session={session} busy={busyId === session.scanId} onReview={(status) => void review(session, status)} />)}</div>}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5"><div className="text-3xl font-black text-white">{value}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</div></div>; }

function LegacyScanReviewCard({ session, busy, onReview }: { session: ScanSession; busy: boolean; onReview: (status: 'approved' | 'rejected') => void }) {
  const needsReview = session.status === 'capture_ready' || session.status === 'in_review';
  return <article className="rounded-3xl border border-white/10 bg-white/[0.05] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-200">{session.scanId}</p><h2 className="mt-2 text-xl font-black uppercase tracking-tight">{session.propertyAddress}</h2>{session.listingId && <p className="mt-1 text-xs text-slate-400">Listing {session.listingId}</p>}</div><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${session.status === 'approved' ? 'border-emerald-200/40 bg-emerald-200/10 text-emerald-100' : session.status === 'rejected' ? 'border-rose-200/40 bg-rose-200/10 text-rose-100' : 'border-amber-200/40 bg-amber-200/10 text-amber-100'}`}>{session.status.replace('_', ' ')}</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Info label="Capture" value={session.captureMode.replace('_', ' ')} /><Info label="Media" value={`${session.assets.length} file${session.assets.length === 1 ? '' : 's'}`} /><Info label="Owner consent" value={session.consent.ownerAuthorized ? 'Confirmed' : 'Missing'} /><Info label="Interior notice" value={session.consent.interiorCaptureAcknowledged ? 'Confirmed' : 'Missing'} /></div><div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300"><Eye className="h-4 w-4 text-teal-200" /> Private media review</div>{session.assets.length ? <ScanMediaGallery scanId={session.scanId} assets={session.assets} /> : <p className="mt-3 text-xs leading-5 text-slate-500">No captures uploaded yet.</p>}</div>{session.reviewNote && <p className="mt-4 text-xs leading-5 text-slate-300">Review note: {session.reviewNote}</p>}{needsReview && <div className="mt-5 flex gap-3"><button type="button" disabled={busy || session.assets.length === 0} onClick={() => onReview('approved')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Approve capture review</button><button type="button" disabled={busy} onClick={() => onReview('rejected')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-100 hover:bg-rose-200/10 disabled:opacity-40"><XCircle className="h-4 w-4" /> Request rescan</button></div>}{session.status === 'approved' && !session.reconstruction && <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4 text-xs leading-5 text-amber-50">Capture review is approved. A real reconstruction processor is not configured yet.</div>}{session.reconstruction?.status === 'ready' && <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4 text-xs leading-5 text-amber-50">Legacy synthetic demo metadata exists for this session. It is not a model of this property and cannot be opened as a listing preview.</div>}</article>;
}

function ScanReviewCard({ session, busy, onReview }: { session: ScanSession; busy: boolean; onReview: (status: 'approved' | 'rejected') => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const needsReview = session.status === 'capture_ready' || session.status === 'in_review';

  useEffect(() => setAcknowledged(false), [session.scanId, session.revision]);

  return <article className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-200">{session.scanId}</p>
        <h2 className="mt-2 text-xl font-black uppercase tracking-tight">{session.propertyAddress}</h2>
        {session.listingId && <p className="mt-1 text-xs text-slate-400">{session.listingLinkStatus === 'verified' ? 'Verified listing' : 'Unresolved listing reference'} · {session.listingId}</p>}
      </div>
      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${session.status === 'approved' ? 'border-emerald-200/40 bg-emerald-200/10 text-emerald-100' : session.status === 'rejected' ? 'border-rose-200/40 bg-rose-200/10 text-rose-100' : 'border-amber-200/40 bg-amber-200/10 text-amber-100'}`}>{session.status.replace('_', ' ')}</span>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Info label="Capture" value={session.captureMode.replace('_', ' ')} /><Info label="Media" value={`${session.assets.length} file${session.assets.length === 1 ? '' : 's'}`} /><Info label="Owner consent" value={session.consent.ownerAuthorized ? 'Confirmed' : 'Missing'} /><Info label="Interior notice" value={session.consent.interiorCaptureAcknowledged ? 'Confirmed' : 'Missing'} /></div>
    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300"><Eye className="h-4 w-4 text-teal-200" /> Private media review</div>{session.assets.length ? <ScanMediaGallery scanId={session.scanId} assets={session.assets} /> : <p className="mt-3 text-xs leading-5 text-slate-500">No captures uploaded yet.</p>}</div>
    {session.reviewNote && <p className="mt-4 text-xs leading-5 text-slate-300">Review note: {session.reviewNote}</p>}
    {needsReview && <div className="mt-5 space-y-3"><label className="flex items-start gap-3 text-xs leading-5 text-slate-300"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-200" />I inspected the available private media for manifest revision {session.revision} and understand approval is only for this exact capture, not public listing publication.</label><div className="flex gap-3"><button type="button" disabled={busy || session.assets.length === 0 || !acknowledged} onClick={() => onReview('approved')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Approve capture review</button><button type="button" disabled={busy} onClick={() => onReview('rejected')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-100 hover:bg-rose-200/10 disabled:opacity-40"><XCircle className="h-4 w-4" /> Request rescan</button></div></div>}
    {session.status === 'approved' && !session.reconstruction && <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4 text-xs leading-5 text-amber-50">Capture review is approved. A real reconstruction processor is not configured yet.</div>}
    {session.reconstruction?.status === 'ready' && <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4 text-xs leading-5 text-amber-50">Legacy synthetic demo metadata exists for this session. It is not a model of this property and cannot be opened as a listing preview.</div>}
  </article>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-1 font-bold capitalize text-slate-200">{value}</p></div>; }
function formatBytes(bytes: number) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
