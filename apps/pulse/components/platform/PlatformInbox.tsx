'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckpointCard, type CheckpointCardData, type CheckpointCardProps } from './CheckpointCard';
import { ManifestForm } from './ManifestForm';
import type { AppManifest } from '@/lib/platform/contracts/appManifest';
import { QuotaBudgetPanel } from './QuotaBudgetPanel';

type Install = { id: string; appKey: string; revision: number; status: 'installed' | 'disabled'; manifest: AppManifest };
type RunSummary = { id: string; status: string; revision: number; definition: { key: string; version: number }; created_at: string };
type ConnectorHealth = { id: string; connector_id: string; connection_id: string; title: string; status: 'healthy' | 'unavailable' | 'schema_drift' | 'stale'; checked_at: string; snapshot_hash: string | null; detail: Record<string, string | number | boolean | null>; scheduler_status: 'fresh' | 'due' | 'queued' | 'running' | 'overdue'; next_check_at: string | null; receipt_id: string | null; operation_id: string | null; receipt_recorded_at: string | null };
type HealthSummary = { healthy: number; unavailable: number; schema_drift: number; stale: number };
type HealthHistory = { id: string; connector_id: string; health_id: string; status: ConnectorHealth['status']; checked_at: string; recorded_at: string; snapshot_hash: string | null };
type ProviderException = { id: string; exception_type: 'quota_breach' | 'review_revoked'; provider_key: string; adapter_key: string; review_id: string | null; connector_id: string | null; run_id: string | null; reservation_id: string | null; operation_id: string | null; occurred_at: string; utc_day: string | null; observed_cost_usd: number | null; configured_limit_usd: number | null; reviewed_at: string | null; revoked_at: string | null; resolution_id: string | null; resolution_reason: string | null; resolution_actor_id: string | null; resolution_at: string | null };
type UnknownEffect = { receipt_id: string; run_id: string; checkpoint_id: string | null; operation_id: string; operation_hash: string; target_hash: string; receipt_created_at: string; provider_review_id: string | null; provider_review_hash: string | null; recovery_review_id: string | null; reconciliation_key: string | null; recovery_outcome: 'applied' | 'not_applied' | null; evidence_source: 'provider_lookup' | 'manual_review' | null; evidence_reference: string | null; evidence_hash: string | null; recovery_actor_id: string | null; recovery_created_at: string | null; retry_intent_id: string | null; retry_operation_id: string | null; retry_created_at: string | null };

export function PlatformInbox({ workspaceId }: { workspaceId: string }) {
  const [checkpoints, setCheckpoints] = useState<CheckpointCardData[]>([]);
  const [connectorHealth, setConnectorHealth] = useState<ConnectorHealth[]>([]);
  const [healthCursor, setHealthCursor] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary>({ healthy: 0, unavailable: 0, schema_drift: 0, stale: 0 });
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);
  const [healthHistoryCursor, setHealthHistoryCursor] = useState<string | null>(null);
  const [providerExceptions, setProviderExceptions] = useState<ProviderException[]>([]);
  const [providerExceptionCursor, setProviderExceptionCursor] = useState<string | null>(null);
  const [unknownEffects, setUnknownEffects] = useState<UnknownEffect[]>([]);
  const [unknownEffectCursor, setUnknownEffectCursor] = useState<string | null>(null);
  const [canManageRecovery, setCanManageRecovery] = useState(false);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, { source: 'provider_lookup' | 'manual_review'; outcome: 'applied' | 'not_applied'; reference: string; hash: string }>>({});
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
      setProviderExceptions(checkpointBody.result.providerExceptions || []);
      setProviderExceptionCursor(checkpointBody.result.providerExceptionsNextCursor || null);
      if (!nextCursor) {
        setUnknownEffects(checkpointBody.result.unknownEffects || []);
        setUnknownEffectCursor(checkpointBody.result.unknownEffectsNextCursor || null);
      }
      setCanManageRecovery(Boolean(checkpointBody.result.canManageProviderRecovery));
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

  const loadMoreProviderExceptions = useCallback(async () => {
    if (!providerExceptionCursor) return;
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/checkpoints?providerExceptionCursor=${encodeURIComponent(providerExceptionCursor)}&providerExceptionLimit=20`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Provider exception data is unavailable.');
    setProviderExceptions((current) => [...current, ...(body.result.providerExceptions || [])]);
    setProviderExceptionCursor(body.result.providerExceptionsNextCursor || null);
  }, [providerExceptionCursor, workspaceId]);

  const loadMoreUnknownEffects = useCallback(async () => {
    if (!unknownEffectCursor) return;
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/checkpoints?unknownEffectCursor=${encodeURIComponent(unknownEffectCursor)}&unknownEffectLimit=20`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unknown effect evidence is unavailable.');
    setUnknownEffects((current) => [...current, ...(body.result.unknownEffects || [])]);
    setUnknownEffectCursor(body.result.unknownEffectsNextCursor || null);
  }, [unknownEffectCursor, workspaceId]);

  async function resolveException(exception: ProviderException) {
    const response = await fetch(`/api/workspaces/${workspaceId}/provider-exceptions/${exception.id}/resolve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptionType: exception.exception_type, resolutionKey: crypto.randomUUID(), reason: 'investigated' }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Exception review could not be recorded.');
    await load();
  }

  async function recordUnknownRecovery(effect: UnknownEffect) {
    const draft = evidenceDrafts[effect.receipt_id];
    if (!draft) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/effect-receipts/${effect.receipt_id}/recovery-review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reconciliationKey: crypto.randomUUID(), outcome: draft.outcome, evidenceSource: draft.source, evidenceReference: draft.reference.trim(), evidenceHash: draft.hash.trim().toLowerCase() }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Recovery evidence could not be recorded.');
    await load();
  }

  async function createRetryIntent(effect: UnknownEffect) {
    if (!effect.recovery_review_id) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/effect-receipts/${effect.receipt_id}/retry-intents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryReviewId: effect.recovery_review_id, idempotencyKey: crypto.randomUUID(), retryOperationId: crypto.randomUUID() }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Retry intent could not be recorded.');
    await load();
  }

  async function runRecoveryAction(action: () => Promise<void>) {
    setError(null);
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Recovery action could not be saved.'); }
  }

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
      <div className="space-y-6"><div className="space-y-4"><h2 className="text-lg font-bold">Pending checkpoints</h2>{loading && !checkpoints.length ? <p className="text-sm text-slate-400">Loading workspace…</p> : null}{!loading && !checkpoints.length ? <p className="text-sm text-slate-400">Nothing needs your input.</p> : null}{checkpoints.map((checkpoint) => <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} onRespond={respond} />)}{cursor ? <button type="button" onClick={() => void load(cursor)} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more</button> : null}</div><div className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Connector health</h2><span className="text-xs text-slate-400">{healthSummary.healthy} healthy · {healthSummary.unavailable + healthSummary.schema_drift + healthSummary.stale} needs review</span></div>{connectorHealth.length ? connectorHealth.map((health) => <div key={health.id} className={`rounded-lg border p-3 ${health.status === 'healthy' ? 'border-emerald-300/20 bg-emerald-300/5' : 'border-amber-300/30 bg-amber-300/10'}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{health.title}</span><span className="text-xs font-bold uppercase tracking-wide">{health.status.replace('_', ' ')}</span></div><p className="mt-1 text-xs text-slate-400">Last checked {new Date(health.checked_at).toLocaleString()} · scheduler {health.scheduler_status}</p>{health.next_check_at ? <p className="mt-1 text-xs text-slate-500">Next check {new Date(health.next_check_at).toLocaleString()}</p> : null}{health.status !== 'healthy' ? <p className="mt-2 text-xs text-amber-100">This connection is not available for live execution. Review the connector before enabling provider calls.</p> : null}{health.scheduler_status !== 'fresh' ? <button type="button" onClick={() => void retryHealth(health)} className="mt-3 rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold">Schedule fresh check</button> : null}</div>) : <p className="text-sm text-slate-400">No connector health checks recorded.</p>}{healthCursor ? <button type="button" onClick={() => void loadMoreHealth()} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more health</button> : null}</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Provider exceptions</h2><span className="text-xs text-slate-400">Review-only · resolution never clears a fence</span></div>
          {providerExceptions.length ? providerExceptions.map((exception) => <article key={`${exception.exception_type}-${exception.id}`} className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{exception.exception_type === 'quota_breach' ? 'Provider daily spend limit exceeded' : 'Provider adapter review revoked'}</h3><time className="text-xs text-slate-400">{new Date(exception.occurred_at).toLocaleString()}</time></div>
            <p className="mt-1 text-xs text-amber-100">{exception.provider_key} / {exception.adapter_key}{exception.exception_type === 'quota_breach' && exception.utc_day ? ` · UTC day ${exception.utc_day}` : ''}</p>
            {exception.exception_type === 'quota_breach' ? <p className="mt-1 text-xs text-slate-300">Observed ${Number(exception.observed_cost_usd).toFixed(2)} against ${Number(exception.configured_limit_usd).toFixed(2)} daily ceiling. New operations remain fenced for this UTC day.</p> : <p className="mt-1 text-xs text-slate-300">Review {exception.review_id} is revoked. New operations require a newly reviewed adapter version.</p>}
            {exception.reservation_id ? <p className="mt-2 break-all text-[11px] text-slate-500">Reservation {exception.reservation_id}{exception.operation_id ? ` · operation ${exception.operation_id}` : ''}</p> : null}
            {exception.run_id ? <Link href={`/workspaces/${workspaceId}/runs/${exception.run_id}`} className="mt-2 inline-block text-xs font-semibold text-cyan-200 underline">Open affected run</Link> : null}
            {exception.resolution_id ? <p className="mt-2 text-xs text-emerald-200">Latest review: {exception.resolution_reason?.replaceAll('_', ' ')} · {new Date(exception.resolution_at || exception.occurred_at).toLocaleString()}. Fence/evidence remains unchanged.</p> : null}
            {canManageRecovery ? <button type="button" onClick={() => void runRecoveryAction(() => resolveException(exception))} className="mt-3 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold">{exception.resolution_id ? 'Append another review record' : 'Record as investigated'}</button> : null}
          </article>) : <p className="text-sm text-slate-400">No provider quota or review exceptions recorded.</p>}
          {providerExceptionCursor ? <button type="button" onClick={() => void loadMoreProviderExceptions()} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more provider exceptions</button> : null}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Unknown effect outcomes</h2><span className="text-xs font-bold text-amber-200">No retry is dispatched</span></div>
          <p className="text-xs text-slate-400">An unknown receipt means acceptance could not be confirmed. Record provider lookup or manual-review evidence before creating a retry intent.</p>
          {unknownEffects.length ? unknownEffects.map((effect) => {
            const draft = evidenceDrafts[effect.receipt_id] || { source: 'provider_lookup' as const, outcome: 'not_applied' as const, reference: '', hash: '' };
            return <article key={effect.receipt_id} className="space-y-3 rounded-lg border border-orange-300/30 bg-orange-300/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Unknown provider outcome</h3><time className="text-xs text-slate-400">{new Date(effect.receipt_created_at).toLocaleString()}</time></div>
              <p className="break-all text-xs text-slate-300">Operation {effect.operation_id} · run {effect.run_id}</p>
              <p className="break-all text-[11px] text-slate-500">Original operation hash {effect.operation_hash} · target hash {effect.target_hash}</p>
              {effect.provider_review_id ? <p className="break-all text-[11px] text-slate-500">Pinned provider review {effect.provider_review_id} · contract {effect.provider_review_hash}</p> : <p className="text-xs text-amber-200">No pinned provider review is attached; retry intent will remain unavailable.</p>}
              {effect.recovery_review_id ? <div className="rounded border border-white/10 bg-black/20 p-2 text-xs"><p>Latest evidence: {effect.recovery_outcome?.replace('_', ' ')} via {effect.evidence_source} · reference {effect.evidence_reference}</p><p className="mt-1 break-all text-[11px] text-slate-500">SHA-256 {effect.evidence_hash}</p></div> : null}
              {effect.retry_intent_id ? <p className="rounded bg-amber-300/10 p-2 text-xs font-semibold text-amber-100">Retry intent {effect.retry_operation_id} recorded — not dispatched.</p> : null}
              {canManageRecovery && !effect.retry_intent_id ? <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-300">Evidence source<select aria-label="Evidence source" value={draft.source} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [effect.receipt_id]: { ...draft, source: event.target.value as typeof draft.source } }))} className="mt-1 block w-full rounded border border-white/15 bg-slate-950 px-2 py-2"><option value="provider_lookup">Provider lookup</option><option value="manual_review">Manual review</option></select></label>
                <label className="text-xs text-slate-300">Finding<select aria-label="Recovery finding" value={draft.outcome} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [effect.receipt_id]: { ...draft, outcome: event.target.value as typeof draft.outcome } }))} className="mt-1 block w-full rounded border border-white/15 bg-slate-950 px-2 py-2"><option value="not_applied">Not applied</option><option value="applied">Applied</option></select></label>
                <label className="text-xs text-slate-300">Evidence reference<input aria-label="Evidence reference" value={draft.reference} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [effect.receipt_id]: { ...draft, reference: event.target.value } }))} maxLength={120} placeholder="Provider ticket / lookup ID" className="mt-1 block w-full rounded border border-white/15 bg-slate-950 px-2 py-2" /></label>
                <label className="text-xs text-slate-300">Evidence SHA-256<input aria-label="Evidence SHA-256" value={draft.hash} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [effect.receipt_id]: { ...draft, hash: event.target.value } }))} maxLength={64} placeholder="64 lowercase hex characters" className="mt-1 block w-full rounded border border-white/15 bg-slate-950 px-2 py-2" /></label>
                <button type="button" onClick={() => void runRecoveryAction(() => recordUnknownRecovery(effect))} disabled={draft.reference.length < 1 || draft.hash.length !== 64} className="rounded-md bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Append recovery evidence</button>
                {effect.recovery_outcome === 'not_applied' && !effect.retry_intent_id ? <button type="button" onClick={() => void runRecoveryAction(() => createRetryIntent(effect))} className="rounded-md border border-amber-200/30 px-3 py-2 text-xs font-bold text-amber-100">Create retry intent — not dispatched</button> : null}
              </div> : null}
              {effect.run_id ? <Link href={`/workspaces/${workspaceId}/runs/${effect.run_id}`} className="text-xs font-semibold text-cyan-200 underline">Open affected run</Link> : null}
            </article>;
          }) : <p className="text-sm text-slate-400">No unknown effect outcomes need review.</p>}
          {unknownEffectCursor ? <button type="button" onClick={() => void loadMoreUnknownEffects()} className="rounded-md border border-white/15 px-3 py-2 text-sm">Load more unknown outcomes</button> : null}
        </div>
      </div>
      <div className="space-y-6"><div className="space-y-4"><h2 className="text-lg font-bold">Installed intakes</h2>{installs.filter((install) => install.status === 'installed').map((install) => <div key={install.id} className="rounded-xl border border-white/10 bg-slate-900/80 p-5"><p className="text-xs font-black uppercase tracking-wide text-cyan-200">{install.appKey}</p><h3 className="mt-2 text-lg font-bold">{install.manifest.title}</h3><p className="mt-1 text-xs text-slate-400">Install revision {install.revision}</p><button type="button" onClick={() => { setSelected(install); setDraft({}); }} className="mt-4 rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Start intake</button></div>)}</div><div className="space-y-3"><h2 className="text-lg font-bold">Recent runs</h2>{runs.length ? runs.map((run) => <Link key={run.id} href={`/workspaces/${workspaceId}/runs/${run.id}`} className="block rounded-lg border border-white/10 bg-slate-900/60 p-3 hover:border-cyan-300/40"><span className="text-sm font-semibold">{run.definition.key}</span><span className="ml-2 text-xs text-slate-400">{run.status} · v{run.definition.version}</span></Link>) : <p className="text-sm text-slate-400">No runs recorded.</p>}</div></div>
    </section>
    <QuotaBudgetPanel workspaceId={workspaceId} />
    {selected ? <section className="rounded-xl border border-cyan-300/20 bg-slate-900/80 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{selected.manifest.title}</h2><button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-400">Cancel</button></div><ManifestForm schema={selected.manifest.inputSchema} value={draft} onChange={setDraft} onSubmit={launch} submitLabel="Launch intake" /></section> : null}
  </div></main>;
}
