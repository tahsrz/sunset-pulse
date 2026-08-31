'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Vibe = {
  vibeId: string;
  title?: string;
  name?: string;
  status?: string;
};

type LifecycleAction = 'reject' | 'archive' | 'trash' | 'restore';

const labels: Record<LifecycleAction, string> = {
  reject: 'Return to draft',
  archive: 'Archive vibe',
  trash: 'Move to trash',
  restore: 'Restore vibe',
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export default function VibeActionsPage() {
  const { vibeId } = useParams<{ vibeId: string }>();
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vibes/${encodeURIComponent(vibeId)}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : Promise.reject(new Error('Unable to load vibe.'))))
      .then((payload) => setVibe(payload.vibe ?? null))
      .catch((loadError: unknown) => {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('Unable to load this Vibe.');
        }
      });

    return () => controller.abort();
  }, [vibeId]);

  async function runAction(action: LifecycleAction) {
    if (action === 'reject' && reason.trim().length < 3) {
      setError('Add a short reason before returning this Vibe to draft.');
      return;
    }

    if (action === 'trash' && !window.confirm('Move this Vibe to trash? You can restore it later.')) {
      return;
    }

    setError('');
    setPendingAction(action);
    try {
      const response = await fetch(`/api/vibes/${encodeURIComponent(vibeId)}/${action}`, {
        method: 'POST',
        headers: action === 'reject' ? { 'content-type': 'application/json' } : undefined,
        body: action === 'reject' ? JSON.stringify({ reason: reason.trim() }) : undefined,
      });
      const payload = await response.json();
      if (!response.ok || !payload.vibe) {
        setError(payload.error || `${labels[action]} failed.`);
        return;
      }

      setVibe(payload.vibe);
      setReason('');
      window.dispatchEvent(new Event('vibe-status-changed'));
    } catch {
      setError(`${labels[action]} failed. Check your connection and try again.`);
    } finally {
      setPendingAction(null);
    }
  }

  if (!vibe) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-500">{error || 'Loading Vibe actions…'}</main>;
  }

  const status = vibe.status || 'draft';
  const canArchive = status === 'draft' || status === 'in_review' || status === 'published';
  const canTrash = status === 'draft' || status === 'in_review' || status === 'archived';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href={`/vibes/${encodeURIComponent(vibeId)}/edit`} className="text-sm font-semibold text-slate-500 hover:underline">← Back to editor</Link>
        <h1 className="mt-4 text-3xl font-black">Status &amp; Actions</h1>
        <p className="mt-1 text-sm text-slate-600">Manage the editorial state of <strong>{vibe.title || vibe.name || vibe.vibeId}</strong>.</p>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current status</p>
          <p className="mt-1 text-lg font-bold capitalize text-slate-900">{statusLabel(status)}</p>
          {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
        </section>

        {status === 'in_review' ? (
          <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950">Return this review to draft</h2>
            <p className="mt-1 text-sm text-amber-900">Explain what needs to change. The note is saved to the Vibe audit history.</p>
            <label className="mt-4 block text-sm font-bold text-amber-950">
              Rejection reason
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-amber-300 bg-white px-3 py-2 font-normal text-slate-900" placeholder="For example: revise the color and voice guidance." />
            </label>
            <button type="button" onClick={() => void runAction('reject')} disabled={pendingAction !== null} className="mt-4 rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {pendingAction === 'reject' ? 'Returning…' : labels.reject}
            </button>
          </section>
        ) : null}

        {canArchive ? (
          <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Archive this Vibe</h2>
            <p className="mt-1 text-sm text-slate-600">Archived Vibes remain available in the CMS but are no longer active editorial work.</p>
            <button type="button" onClick={() => void runAction('archive')} disabled={pendingAction !== null} className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">
              {pendingAction === 'archive' ? 'Archiving…' : labels.archive}
            </button>
          </section>
        ) : null}

        {canTrash ? (
          <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-bold text-red-950">Move to trash</h2>
            <p className="mt-1 text-sm text-red-900">This removes the Vibe from normal editorial lists. It can be restored afterward.</p>
            <button type="button" onClick={() => void runAction('trash')} disabled={pendingAction !== null} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {pendingAction === 'trash' ? 'Moving…' : labels.trash}
            </button>
          </section>
        ) : null}

        {status === 'trash' ? (
          <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-lg font-bold text-emerald-950">Restore this Vibe</h2>
            <p className="mt-1 text-sm text-emerald-900">The Vibe will return to the editorial status it had before it was trashed.</p>
            <button type="button" onClick={() => void runAction('restore')} disabled={pendingAction !== null} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {pendingAction === 'restore' ? 'Restoring…' : labels.restore}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
