'use client';

import React, { useEffect, useState } from 'react';
import { cmsPageDraftSchema, type CmsPageDraft } from '@/lib/cms/pages/pageSchema';

type Revision = { _id: string; revisionNumber: number; changeSummary?: string; publishedAt?: string; createdBy?: string };
type Payload = { error?: unknown; revisions?: unknown; page?: unknown };

export function CmsPageRevisions({ pageId, siteId, version, dirty, onRestore }: { pageId: string; siteId: string; version: number; dirty: boolean; onRestore: (draft: CmsPageDraft, version: number) => void }) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'restoring'>('loading');
  const [message, setMessage] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const endpoint = `/api/vibes/pages/${encodeURIComponent(pageId)}/revisions?siteId=${encodeURIComponent(siteId)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal }).then(async (response) => {
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(errorText(payload, 'Revision history could not be loaded.'));
      setRevisions(readRevisions(payload?.revisions)); setState('ready');
    }).catch((error: Error) => { if (error.name !== 'AbortError') { setMessage(error.message); setState('error'); } });
    return () => controller.abort();
  }, [endpoint]);

  async function restore(revisionId: string) {
    setState('restoring'); setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revisionId, expectedVersion: version }) });
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(errorText(payload, response.status === 409 ? 'Page changed elsewhere. Reload before restoring.' : 'Revision could not be restored.'));
      const page = record(payload?.page); const parsed = cmsPageDraftSchema.safeParse(page?.draftPayload); const nextVersion = page?.currentDraftVersion;
      if (!parsed.success || typeof nextVersion !== 'number') throw new Error('The restore response is incomplete.');
      onRestore(parsed.data, nextVersion); setConfirmId(null); setState('ready'); setMessage('Revision restored as a new draft.');
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Revision could not be restored.'); }
  }

  return <section aria-label="Revision history" className="border-t border-slate-200 p-5"><h2 className="font-semibold">Revisions</h2>{state === 'loading' ? <p className="mt-2 text-sm text-slate-500">Loading history…</p> : null}{message ? <p role={state === 'error' ? 'alert' : 'status'} className="mt-2 text-sm">{message}</p> : null}{state !== 'loading' && revisions.length === 0 ? <p className="mt-2 text-sm text-slate-500">No published revisions yet.</p> : <ol className="mt-3 space-y-3">{revisions.map((revision) => <li key={revision._id} className="border-t pt-3 text-sm"><p className="font-semibold">Revision {revision.revisionNumber}</p><p className="text-xs text-slate-500">{formatDate(revision.publishedAt)}{revision.changeSummary ? ` · ${revision.changeSummary}` : ''}</p>{confirmId === revision._id ? <div className="mt-2"><p className="text-xs text-amber-800">Replace the current draft with this snapshot?</p><div className="mt-2 flex gap-2"><button type="button" disabled={state === 'restoring'} onClick={() => void restore(revision._id)} className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white">Confirm restore</button><button type="button" onClick={() => setConfirmId(null)} className="text-xs underline">Cancel</button></div></div> : <button type="button" disabled={dirty || state === 'restoring'} title={dirty ? 'Save or discard local changes before restoring.' : undefined} onClick={() => setConfirmId(revision._id)} className="mt-2 text-xs font-semibold text-[#2271b1] disabled:text-slate-400">Restore this revision</button>}</li>)}</ol>}</section>;
}

async function readPayload(response: Response): Promise<Payload | null> { const text = await response.text(); if (!text.trim()) return null; try { const value: unknown = JSON.parse(text); return value && typeof value === 'object' ? value as Payload : null; } catch { return null; } }
function record(value: unknown) { return value && typeof value === 'object' ? value as Record<string, unknown> : null; }
function errorText(payload: Payload | null, fallback: string) { return typeof payload?.error === 'string' ? payload.error : fallback; }
function readRevisions(value: unknown): Revision[] { if (!Array.isArray(value)) return []; return value.filter((item): item is Revision => { const row = record(item); return typeof row?._id === 'string' && typeof row.revisionNumber === 'number'; }); }
function formatDate(value?: string) { if (!value) return 'Unknown date'; const date = new Date(value); return Number.isNaN(date.valueOf()) ? 'Unknown date' : date.toLocaleString(); }
