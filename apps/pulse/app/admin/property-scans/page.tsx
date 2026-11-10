'use client';

import fieldbook from '@/components/realtor/Fieldbook.module.css';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ScanLine } from 'lucide-react';
import { ScanReviewCard, type PropertyScanReviewSession } from '@/components/scans/ScanReviewCard';

export default function PropertyScanReviewPage() {
  const [sessions, setSessions] = useState<PropertyScanReviewSession[]>([]);
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

  const review = async (session: PropertyScanReviewSession, status: 'approved' | 'rejected') => {
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
    <main className={fieldbook.surface + " min-h-screen  px-6 py-10 text-white"}>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div><Link href="/admin/research-desk" className="text-xs font-black uppercase tracking-[0.25em] text-teal-200 hover:text-white">← Operations</Link><div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-teal-100"><ScanLine className="h-4 w-4" /> Property scan review</div><h1 className="mt-4 text-4xl font-black uppercase italic tracking-tighter md:text-6xl">Scan review</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Review consent and capture metadata. Approval records review intent; a real reconstruction processor is not configured, and approval does not publish the home or alter the MLS record.</p></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-widest hover:border-teal-200/60 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh queue</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label="Needs review" value={counts.review} /><Metric label="Approved" value={counts.approved} /><Metric label="Rejected" value={counts.rejected} /></div>
        {error && <div className="fieldbook-record mt-6 rounded-2xl border border-rose-200/30 bg-rose-200/10 p-4 text-sm text-rose-100">{error}</div>}
        {loading ? <div className="mt-8 flex items-center gap-3 text-sm text-teal-100"><RefreshCw className="h-4 w-4 animate-spin" /> Loading private capture sessions…</div> : sessions.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm leading-7 text-slate-400">No property scan sessions have been submitted yet. Start one from <Link href="/scan-studio" className="text-teal-200 underline">Scan Studio</Link>.</div> : <div className="mt-8 grid gap-5 lg:grid-cols-2">{sessions.map((session) => <ScanReviewCard key={session.scanId} session={session} busy={busyId === session.scanId} onReview={(status) => void review(session, status)} />)}</div>}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="fieldbook-record rounded-2xl border border-white/10 bg-white/[0.05] p-5"><div className="text-3xl font-black text-white">{value}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</div></div>; }
