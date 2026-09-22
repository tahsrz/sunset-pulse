'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckpointCard, type CheckpointCardData, type CheckpointCardProps } from './CheckpointCard';
import { ManifestForm } from './ManifestForm';
import type { AppManifest } from '@/lib/platform/contracts/appManifest';

type Install = { id: string; appKey: string; revision: number; status: 'installed' | 'disabled'; manifest: AppManifest };

export function PlatformInbox({ workspaceId }: { workspaceId: string }) {
  const [checkpoints, setCheckpoints] = useState<CheckpointCardData[]>([]);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [selected, setSelected] = useState<Install | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextCursor?: string | null) => {
    setLoading(true); setError(null);
    try {
      const suffix = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : '';
      const [checkpointResponse, installResponse] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/checkpoints${suffix}`, { cache: 'no-store' }),
        fetch(`/api/workspaces/${workspaceId}/apps`, { cache: 'no-store' }),
      ]);
      const checkpointBody = await checkpointResponse.json();
      const installBody = await installResponse.json();
      if (!checkpointResponse.ok || !installResponse.ok) throw new Error(checkpointBody.error || installBody.error || 'Workspace data is unavailable.');
      setCheckpoints((current) => nextCursor ? [...current, ...checkpointBody.result.items] : checkpointBody.result.items);
      setCursor(checkpointBody.result.nextCursor);
      setInstalls(installBody.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Workspace data is unavailable.'); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  async function launch(value: Record<string, unknown>) {
    if (!selected) return;
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/apps/launch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      installId: selected.id, expectedInstallRevision: selected.revision, workflowKey: selected.manifest.workflows[0].key,
      requestKey: crypto.randomUUID(), inputs: value, resourceRefs: [],
    }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Launch was not accepted.');
    setSelected(null); setDraft({}); await load();
  }

  async function respond(input: Parameters<CheckpointCardProps['onRespond']>[0]) {
    const response = await fetch(`/api/workspaces/${workspaceId}/checkpoints`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Checkpoint changed. Reload before responding.');
    await load();
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-10"><div className="mx-auto max-w-5xl space-y-8">
    <header><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Shared workspace inbox</p><h1 className="mt-2 text-3xl font-black">Review and organize</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Answers stay attached to the existing run and checkpoint revision. Nothing here approves facts, sends email, or publishes content.</p></header>
    {error ? <div role="alert" className="border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div> : null}
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4"><h2 className="text-lg font-bold">Pending checkpoints</h2>{loading && !checkpoints.length ? <p className="text-sm text-slate-400">Loading workspace…</p> : null}{!loading && !checkpoints.length ? <p className="text-sm text-slate-400">Nothing needs your input.</p> : null}{checkpoints.map((checkpoint) => <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} onRespond={respond} />)}{cursor ? <button type="button" onClick={() => void load(cursor)} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more</button> : null}</div>
      <div className="space-y-4"><h2 className="text-lg font-bold">Installed intakes</h2>{installs.filter((install) => install.status === 'installed').map((install) => <div key={install.id} className="rounded-xl border border-white/10 bg-slate-900/80 p-5"><p className="text-xs font-black uppercase tracking-wide text-cyan-200">{install.appKey}</p><h3 className="mt-2 text-lg font-bold">{install.manifest.title}</h3><p className="mt-1 text-xs text-slate-400">Install revision {install.revision}</p><button type="button" onClick={() => { setSelected(install); setDraft({}); }} className="mt-4 rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Start intake</button></div>)}</div>
    </section>
    {selected ? <section className="rounded-xl border border-cyan-300/20 bg-slate-900/80 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{selected.manifest.title}</h2><button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-400">Cancel</button></div><ManifestForm schema={selected.manifest.inputSchema} value={draft} onChange={setDraft} onSubmit={launch} submitLabel="Launch intake" /></section> : null}
  </div></main>;
}
