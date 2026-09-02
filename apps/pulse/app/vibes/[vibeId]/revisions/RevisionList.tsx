'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { VibeConfirmDialog } from '../../_components/VibeConfirmDialog';

type Revision = {
  _id: string;
  revisionNumber: number;
  parentRevisionId?: string;
  createdBy?: string;
  createdAt?: string;
  publishedAt?: string;
  changeSummary?: string;
};

type RevisionResponse = { revisions?: Revision[]; publishedRevisionId?: string | null };

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString();
}

export function RevisionList({ vibeId }: { vibeId: string }) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmRevision, setConfirmRevision] = useState<{ revision: Revision; reason: string } | null>(null);

  const loadRevisions = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/vibes/${encodeURIComponent(vibeId)}/revisions`);
      if (!response.ok) throw new Error('Unable to load revision history.');
      const payload = await response.json() as RevisionResponse;
      setRevisions(payload.revisions || []);
      setPublishedId(payload.publishedRevisionId || null);
    } catch (reason) {
      setRevisions([]);
      setError(reason instanceof Error ? reason.message : 'Unable to load revision history.');
    }
  }, [vibeId]);

  useEffect(() => {
    void loadRevisions();
  }, [loadRevisions]);

  async function restoreRevision(revision: Revision) {
    const reason = window.prompt(`Why should published revision r${revision.revisionNumber} be restored?`);
    if (!reason?.trim()) return;
    setConfirmRevision({ revision, reason: reason.trim() });
  }

  async function confirmRestore() {
    if (!confirmRevision) return;
    const { revision, reason } = confirmRevision;

    setPendingId(revision._id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/vibes/${encodeURIComponent(vibeId)}/rollback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revisionId: revision._id, reason: reason.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Revision could not be restored.');
      setMessage(`r${revision.revisionNumber} was republished as a new published revision.`);
      await loadRevisions();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Revision could not be restored.');
    } finally {
      setPendingId(null);
      setConfirmRevision(null);
    }
  }

  if (!revisions) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading revisions…</p>;
  if (revisions.length === 0) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No immutable revisions yet.</p>;

  const revisionNumbers = new Map(revisions.map((revision) => [revision._id, revision.revisionNumber]));

  return (
    <section className="overflow-x-auto border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <p className="text-sm text-slate-600">Every entry is immutable. Restoring a prior published revision creates a new published revision and leaves the history intact.</p>
        {message ? <p role="status" className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">Revision</th>
            <th scope="col" className="px-4 py-3">Created</th>
            <th scope="col" className="px-4 py-3">Author</th>
            <th scope="col" className="px-4 py-3">State</th>
            <th scope="col" className="px-4 py-3">Summary</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {revisions.map((revision, index) => {
            const previous = revisions[index + 1];
            const isCurrentPublished = publishedId === revision._id;
            const basedOn = revision.parentRevisionId ? revisionNumbers.get(revision.parentRevisionId) : null;
            const state = isCurrentPublished ? 'Current published' : revision.publishedAt ? 'Published history' : 'Review checkpoint';
            return (
              <tr key={revision._id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-900">r{revision.revisionNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">{revision.createdBy || 'Unknown author'} · {formatDate(revision.createdAt)}</p>
                  {basedOn ? <p className="mt-1 text-xs text-slate-500">Based on r{basedOn}</p> : null}
                  <p className="mt-2 max-w-md text-xs text-slate-600">{revision.changeSummary || 'No editorial summary provided.'}</p>
                </td>
                <td className="hidden px-4 py-3 text-xs text-slate-500 sm:table-cell">{formatDate(revision.createdAt)}</td>
                <td className="hidden px-4 py-3 text-xs sm:table-cell">{revision.createdBy || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${isCurrentPublished ? 'bg-emerald-100 text-emerald-800' : revision.publishedAt ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'}`}>{state}</span>
                  {revision.publishedAt ? <p className="mt-1 text-xs text-slate-500">Published {formatDate(revision.publishedAt)}</p> : null}
                </td>
                <td className="hidden max-w-xs px-4 py-3 text-xs text-slate-600 md:table-cell">{revision.changeSummary || 'No editorial summary provided.'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-2 text-xs font-bold">
                    {isCurrentPublished ? <Link href={`/vibes/${encodeURIComponent(vibeId)}/apply?revisionId=${encodeURIComponent(revision._id)}&revisionNumber=${revision.revisionNumber}`} className="text-[#2271b1] hover:underline">Apply to site</Link> : null}
                    {!isCurrentPublished && revision.publishedAt ? <button type="button" onClick={() => void restoreRevision(revision)} disabled={pendingId !== null} className="text-[#2271b1] hover:underline disabled:opacity-50">{pendingId === revision._id ? 'Republishing…' : 'Republish revision'}</button> : null}
                    {previous ? <Link href={`/vibes/${encodeURIComponent(vibeId)}/compare?from=${encodeURIComponent(previous._id)}&to=${encodeURIComponent(revision._id)}`} className="text-slate-700 hover:underline">Compare with r{previous.revisionNumber}</Link> : <span className="text-slate-400">Baseline</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <VibeConfirmDialog open={confirmRevision !== null} title={`Republish r${confirmRevision?.revision.revisionNumber ?? ''}?`} description="This creates a new published revision. Existing revisions remain unchanged and it does not apply the revision to a site." confirmLabel="Republish revision" cancelLabel="Cancel" busy={pendingId !== null} onOpenChange={(open) => { if (!open && pendingId === null) setConfirmRevision(null); }} onConfirm={() => void confirmRestore()} />
    </section>
  );
}
