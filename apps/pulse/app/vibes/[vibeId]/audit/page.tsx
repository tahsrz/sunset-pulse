'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type AuditEvent = { action: string; actorId: string; reason?: string; revisionId?: string; siteId?: string; occurredAt?: string };

export default function VibeAuditPage() {
  const { vibeId } = useParams<{ vibeId: string }>();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/vibes/${encodeURIComponent(vibeId)}/audit`).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load audit history.'); return payload; }).then((payload) => setEvents(payload.events || [])).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load audit history.'));
  }, [vibeId]);
  const links = [['Edit', 'edit'], ['Preview', 'preview'], ['Submit', 'submit'], ['Publish', 'publish'], ['Revisions', 'revisions'], ['Source', 'source']];
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-3xl"><Link href={`/vibes/${vibeId}/edit`} className="text-sm font-semibold text-slate-500 hover:underline">← Back to editor</Link><h1 className="mt-4 text-3xl font-black">Audit history</h1><p className="mt-1 text-sm text-slate-600">Lifecycle events and workflow actions for this Vibe.</p><nav aria-label="Vibe workflow" className="mt-5 flex flex-wrap gap-2">{links.map(([label, path]) => <Link key={path} href={`/vibes/${vibeId}/${path}`} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50">{label}</Link>)}</nav>{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}<section className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">{events.length === 0 && !error ? <p className="p-6 text-sm text-slate-500">No audit events recorded yet.</p> : events.map((event, index) => <article key={`${event.occurredAt || 'event'}-${index}`} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="uppercase tracking-wide">{event.action}</strong><time className="text-xs text-slate-500">{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : 'Unknown time'}</time></div><p className="mt-2 text-xs text-slate-500">Actor: {event.actorId}{event.revisionId ? ` · Revision: ${event.revisionId}` : ''}{event.siteId ? ` · Site: ${event.siteId}` : ''}</p>{event.reason && <p className="mt-2 text-sm text-slate-700">{event.reason}</p>}</article>)}</section></div></main>;
}
