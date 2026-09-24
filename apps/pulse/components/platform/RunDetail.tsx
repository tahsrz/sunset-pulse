'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckpointCard, type CheckpointCardData, type CheckpointCardProps } from './CheckpointCard';

type RunPayload = { run: { id: string; status: string; revision: number; definition: { key: string; version: number }; app_workflow_key?: string | null; app_install_revision?: number | null; app_resource_refs?: unknown }; checkpoints: CheckpointCardData[] };

export function RunDetail({ workspaceId, runId, embedded = false }: { workspaceId: string; runId: string; embedded?: boolean }) {
  const [payload, setPayload] = useState<RunPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/workspaces/${workspaceId}/runs/${runId}`, { cache: 'no-store' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Run detail is unavailable.');
      if (active) setPayload(body.result);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Run detail is unavailable.'); });
    return () => { active = false; };
  }, [workspaceId, runId]);

  async function respond(input: Parameters<CheckpointCardProps['onRespond']>[0]) {
    const response = await fetch(`/api/workspaces/${workspaceId}/checkpoints`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Checkpoint changed. Reload before responding.');
    const refreshed = await fetch(`/api/workspaces/${workspaceId}/runs/${runId}`, { cache: 'no-store' });
    const refreshedBody = await refreshed.json();
    if (!refreshed.ok) throw new Error(refreshedBody.error || 'Run detail is unavailable.');
    setPayload(refreshedBody.result);
  }

  if (error) return <div className={embedded ? 'text-rose-100' : 'min-h-screen bg-slate-950 p-8 text-rose-100'}><p role="alert">{error}</p></div>;
  if (!payload) return <div className={embedded ? 'text-slate-300' : 'min-h-screen bg-slate-950 p-8 text-slate-300'}>Loading run…</div>;
  return <div className={embedded ? 'space-y-6 text-white' : 'min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-10'}><div className={embedded ? 'space-y-6' : 'mx-auto max-w-3xl space-y-6'}>
    {!embedded ? <Link href={`/workspaces/${workspaceId}/inbox`} className="text-sm text-cyan-200">← Back to inbox</Link> : null}
    <header><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Run detail</p><h1 className="mt-2 text-3xl font-black">{payload.run.definition.key}</h1><p className="mt-2 text-sm text-slate-400">Status: {payload.run.status} · Run revision {payload.run.revision} · Workflow v{payload.run.definition.version}</p>{payload.run.app_workflow_key ? <p className="mt-1 text-xs text-slate-500">Pinned app workflow: {payload.run.app_workflow_key} · install revision {payload.run.app_install_revision}</p> : null}</header>
    <section className="space-y-4"><h2 className="text-lg font-bold">Checkpoints</h2>{payload.checkpoints.length ? payload.checkpoints.map((checkpoint) => <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} onRespond={respond} />) : <p className="text-sm text-slate-400">No checkpoints recorded.</p>}</section>
  </div></div>;
}
