'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckpointCard, type CheckpointCardData, type CheckpointCardProps } from './CheckpointCard';
import { ManifestForm } from './ManifestForm';
import type { AppManifest } from '@/lib/platform/contracts/appManifest';

type Install = { id: string; appKey: string; revision: number; status: 'installed' | 'disabled'; manifest: AppManifest };
type RunSummary = { id: string; status: string; revision: number; definition: { key: string; version: number }; created_at: string };
type ConnectorHealth = { id: string; connector_id: string; connection_id: string; title: string; status: 'healthy' | 'unavailable' | 'schema_drift' | 'stale'; checked_at: string; snapshot_hash: string | null; detail: Record<string, string | number | boolean | null>; scheduler_status: 'fresh' | 'due' | 'queued' | 'running' | 'overdue'; next_check_at: string | null };
type HealthSummary = { healthy: number; unavailable: number; schema_drift: number; stale: number };
type HealthHistory = { id: string; connector_id: string; health_id: string; status: ConnectorHealth['status']; checked_at: string; recorded_at: string; snapshot_hash: string | null };

export function PlatformInbox({ workspaceId }: { workspaceId: string }) {
  const [checkpoints, setCheckpoints] = useState<CheckpointCardData[]>([]);
  const [connectorHealth, setConnectorHealth] = useState<ConnectorHealth[]>([]);
  const [healthCursor, setHealthCursor] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary>({ healthy: 0, unavailable: 0, schema_drift: 0, stale: 0 });
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);
  const [healthHistoryCursor, setHealthHistoryCursor] = useState<string | null>(null);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selected, setSelected] = useState<Install | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextCursor?: string | null) => {
    setLoading(true); setError(null);
    try {
      const suffix = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : '';
      const [checkpointResponse, installResponse, runResponse] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/checkpoints${suffix}`, { cache: 'no-store' }),
        fetch(`/api/workspaces/${workspaceId}/apps`, { cache: 'no-store' }),
        fetch(`/api/workspaces/${workspaceId}/runs?limit=25`, { cache: 'no-store' }),
      ]);
      const checkpointBody = await checkpointResponse.json();
      const installBody = await installResponse.json();
      const runBody = await runResponse.json();
      if (!checkpointResponse.ok || !installResponse.ok || !runResponse.ok) throw new Error(checkpointBody.error || installBody.error || runBody.error || 'Workspace data is unavailable.');
      setCheckpoints((current) => nextCursor ? [...current, ...checkpointBody.result.items] : checkpointBody.result.items);
      setConnectorHealth(checkpointBody.result.health || []);
      setHealthCursor(checkpointBody.result.healthNextCursor || null);
      setHealthSummary(checkpointBody.result.healthSummary || { healthy: 0, unavailable: 0, schema_drift: 0, stale: 0 });
      setHealthHistory(checkpointBody.result.healthHistory || []);
      setHealthHistoryCursor(checkpointBody.result.healthHistoryNextCursor || null);
      setCursor(checkpointBody.result.nextCursor);
      setInstalls(installBody.result);
      setRuns(runBody.result.items);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Workspace data is unavailable.'); }
    finally { setLoading(false); }
  }, [workspaceId]);

  const loadMoreHealth = useCallback(async () => {
    if (!healthCursor) return;
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/checkpoints?healthCursor=${encodeURIComponent(healthCursor)}&healthLimit=20`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Health data is unavailable.');
    setConnectorHealth((current) => [...current, ...(body.result.health || [])]);
    setHealthCursor(body.result.healthNextCursor || null);
    setHealthSummary(body.result.healthSummary || healthSummary);
  }, [healthCursor, healthSummary, workspaceId]);

  const loadMoreHealthHistory = useCallback(async () => {
    if (!healthHistoryCursor) return;
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/checkpoints?healthHistoryCursor=${encodeURIComponent(healthHistoryCursor)}&healthHistoryLimit=20`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Health history is unavailable.');
    setHealthHistory((current) => [...current, ...(body.result.healthHistory || [])]);
    setHealthHistoryCursor(body.result.healthHistoryNextCursor || null);
  }, [healthHistoryCursor, workspaceId]);

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

  async function retryHealth(health: ConnectorHealth) {
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/connector-health/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId: health.connector_id, eventKey: `health-retry-${health.connector_id}-${crypto.randomUUID()}` }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Health check scheduling is unavailable.');
    await load();
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-10"><div className="mx-auto max-w-5xl space-y-8">
    <header><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Shared workspace inbox</p><h1 className="mt-2 text-3xl font-black">Review and organize</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Answers stay attached to the existing run and checkpoint revision. Nothing here approves facts, sends email, or publishes content.</p></header>
    {error ? <div role="alert" className="border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div> : null}
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6"><div className="space-y-4"><h2 className="text-lg font-bold">Pending checkpoints</h2>{loading && !checkpoints.length ? <p className="text-sm text-slate-400">Loading workspace…</p> : null}{!loading && !checkpoints.length ? <p className="text-sm text-slate-400">Nothing needs your input.</p> : null}{checkpoints.map((checkpoint) => <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} onRespond={respond} />)}{cursor ? <button type="button" onClick={() => void load(cursor)} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more</button> : null}</div><div className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Connector health</h2><span className="text-xs text-slate-400">{healthSummary.healthy} healthy · {healthSummary.unavailable + healthSummary.schema_drift + healthSummary.stale} needs review</span></div>{connectorHealth.length ? connectorHealth.map((health) => <div key={health.id} className={`rounded-lg border p-3 ${health.status === 'healthy' ? 'border-emerald-300/20 bg-emerald-300/5' : 'border-amber-300/30 bg-amber-300/10'}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{health.title}</span><span className="text-xs font-bold uppercase tracking-wide">{health.status.replace('_', ' ')}</span></div><p className="mt-1 text-xs text-slate-400">Last checked {new Date(health.checked_at).toLocaleString()} · scheduler {health.scheduler_status}</p>{health.next_check_at ? <p className="mt-1 text-xs text-slate-500">Next check {new Date(health.next_check_at).toLocaleString()}</p> : null}{health.status !== 'healthy' ? <p className="mt-2 text-xs text-amber-100">This connection is not available for live execution. Review the connector before enabling provider calls.</p> : null}{health.scheduler_status !== 'fresh' ? <button type="button" onClick={() => void retryHealth(health)} className="mt-3 rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold">Schedule fresh check</button> : null}</div>) : <p className="text-sm text-slate-400">No connector health checks recorded.</p>}{healthCursor ? <button type="button" onClick={() => void loadMoreHealth()} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more health</button> : null}</div></div>
      <div className="space-y-6"><div className="space-y-4"><h2 className="text-lg font-bold">Installed intakes</h2>{installs.filter((install) => install.status === 'installed').map((install) => <div key={install.id} className="rounded-xl border border-white/10 bg-slate-900/80 p-5"><p className="text-xs font-black uppercase tracking-wide text-cyan-200">{install.appKey}</p><h3 className="mt-2 text-lg font-bold">{install.manifest.title}</h3><p className="mt-1 text-xs text-slate-400">Install revision {install.revision}</p><button type="button" onClick={() => { setSelected(install); setDraft({}); }} className="mt-4 rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Start intake</button></div>)}</div><div className="space-y-3"><h2 className="text-lg font-bold">Recent runs</h2>{runs.length ? runs.map((run) => <Link key={run.id} href={`/workspaces/${workspaceId}/runs/${run.id}`} className="block rounded-lg border border-white/10 bg-slate-900/60 p-3 hover:border-cyan-300/40"><span className="text-sm font-semibold">{run.definition.key}</span><span className="ml-2 text-xs text-slate-400">{run.status} · v{run.definition.version}</span></Link>) : <p className="text-sm text-slate-400">No runs recorded.</p>}</div></div>
    </section>
    {selected ? <section className="rounded-xl border border-cyan-300/20 bg-slate-900/80 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{selected.manifest.title}</h2><button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-400">Cancel</button></div><ManifestForm schema={selected.manifest.inputSchema} value={draft} onChange={setDraft} onSubmit={launch} submitLabel="Launch intake" /></section> : null}
  </div></main>;
}
