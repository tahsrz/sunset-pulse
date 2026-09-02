'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VibePageHeader } from '../../_components/VibePageHeader';

export default function SubmitVibePage() {
  const { vibeId } = useParams<{ vibeId: string }>(); const router = useRouter(); const [vibe, setVibe] = useState<any>(null); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { fetch(`/api/vibes/${encodeURIComponent(vibeId)}`).then((r) => r.json()).then((p) => setVibe(p.vibe)).catch(() => setError('Unable to load vibe.')); }, [vibeId]);
  async function submit() { setSubmitting(true); const response = await fetch(`/api/vibes/${encodeURIComponent(vibeId)}/submit`, { method: 'POST' }); const payload = await response.json(); if (!response.ok) { setError(payload.error || 'Submission failed.'); setSubmitting(false); return; } window.dispatchEvent(new Event('vibe-status-changed')); router.push(`/vibes/${encodeURIComponent(vibeId)}/edit`); }
  if (!vibe) return <main className="min-h-screen bg-slate-100 p-8 text-slate-500">Loading submission review…</main>;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-2xl"><VibePageHeader title="Submit for review" description={<>Send <strong>{vibe.title || vibe.name || vibe.vibeId}</strong> to the review queue.</>} backHref={`/vibes/${vibeId}/edit`} backLabel="Back to editor" /><section className="mt-6 border border-slate-200 bg-white p-5 sm:p-6"><p className="text-sm text-slate-700">The current draft will become an in-review item. Publication remains a separate action and will create an immutable revision.</p>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<button onClick={() => void submit()} disabled={submitting || vibe.status !== 'draft'} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{vibe.status !== 'draft' ? `Already ${vibe.status}` : submitting ? 'Submitting…' : 'Submit for review'}</button></section></div></main>;
}
