'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { CanvasLayout } from '@/lib/platform/contracts/canvasLayout';

type MonitorPanel = Extract<CanvasLayout['windows'][number]['window'], { kind: 'system_monitor' }>['target']['panel'];
type HealthResult = { healthSummary: { healthy: number; unavailable: number; schema_drift: number; stale: number }; health: Array<{ id: string; title: string; status: string; scheduler_status: string; checked_at: string }> };
type RunResult = { items: Array<{ id: string; status: string; definition: { key: string; version: number } }>; nextCursor: string | null };
type QuotaBudget = { max_concurrent_operations: number; max_steps_per_run: number; max_estimated_cost_usd: number; max_tokens_per_run: number; max_run_estimated_cost_usd: number; max_run_duration_seconds: number; revision: number } | null;
type ProviderQuota = { provider_key: string; adapter_key: string; max_concurrent_operations: number; max_reserved_cost_usd: number; max_daily_cost_usd: number; revision: number };

async function fetchResult<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error || 'Workspace monitor data is unavailable.'), { status: response.status });
  return body.result as T;
}

export function SystemMonitorWindow({ workspaceId, panel }: { workspaceId: string; panel: MonitorPanel }) {
  const [data, setData] = useState<HealthResult | RunResult | { budget: QuotaBudget; providers: ProviderQuota[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (panel === 'connectors') {
        const query = 'limit=1&healthLimit=12&healthHistoryLimit=1&healthAuditLimit=1&providerExceptionLimit=1&unknownEffectLimit=1';
        setData(await fetchResult<HealthResult>(`/api/workspaces/${workspaceId}/checkpoints?${query}`));
      } else if (panel === 'scheduler') {
        setData(await fetchResult<RunResult>(`/api/workspaces/${workspaceId}/runs?limit=25`));
      } else {
        const [budget, providers] = await Promise.all([
          fetchResult<QuotaBudget>(`/api/workspaces/${workspaceId}/quotas`),
          fetchResult<ProviderQuota[]>(`/api/workspaces/${workspaceId}/quotas/providers`),
        ]);
        setData({ budget, providers });
      }
    } catch (cause) {
      const errorStatus = (cause as { status?: number })?.status;
      setError(errorStatus === 403 ? 'This workspace read is limited to owners and admins.' : cause instanceof Error ? cause.message : 'Workspace monitor data is unavailable.');
    } finally { setLoading(false); }
  }, [panel, workspaceId]);

  useEffect(() => { void reload(); }, [reload]);

  const title = panel === 'connectors' ? 'Connector health' : panel === 'quotas' ? 'Workspace quota settings' : 'Workspace run summary';
  return <section aria-label={title} className="space-y-3 p-2">
    <header className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold">{title}</h3><p className="text-[11px] text-slate-400">Read-only view from existing workspace APIs.</p></div><button type="button" onClick={() => void reload()} disabled={loading} className="rounded border border-white/15 px-2 py-1 text-xs disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button></header>
    {error ? <p role="alert" className="rounded border border-rose-200/20 bg-rose-200/5 p-2 text-xs text-rose-100">{error}</p> : null}
    {panel === 'connectors' && data && 'healthSummary' in data ? <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{Object.entries(data.healthSummary).map(([status, count]) => <div key={status} className="rounded border border-white/10 p-2"><dt className="capitalize text-slate-400">{status.replace('_', ' ')}</dt><dd className="mt-1 font-bold">{count}</dd></div>)}</dl>
      {data.health.length ? <ul className="space-y-1">{data.health.map((entry) => <li key={entry.id} className="rounded border border-white/10 p-2 text-xs"><span className="font-semibold">{entry.title}</span><span className="ml-2 text-slate-400">{entry.status} · check {entry.scheduler_status}</span></li>)}</ul> : <p className="text-xs text-slate-400">No connector health records yet.</p>}
    </div> : null}
    {panel === 'scheduler' && data && 'items' in data ? <div className="space-y-2">
      <p className="text-xs text-slate-400">A bounded summary of workspace runs; this does not inspect or control scheduler queue jobs.</p>
      {data.items.length ? <ul className="space-y-1">{data.items.map((run) => <li key={run.id} className="rounded border border-white/10 p-2 text-xs"><span className="font-semibold">{run.definition.key}</span><span className="ml-2 text-slate-400">{run.status} · v{run.definition.version}</span></li>)}</ul> : <p className="text-xs text-slate-400">No runs found in the first 25.</p>}
      {data.nextCursor ? <p className="text-[11px] text-slate-500">Additional runs exist beyond this bounded page.</p> : null}
    </div> : null}
    {panel === 'quotas' && data && 'budget' in data ? <div className="space-y-3 text-xs">
      {data.budget ? <dl className="grid grid-cols-2 gap-2">{[
        ['Concurrent operations', data.budget.max_concurrent_operations], ['Steps per run', data.budget.max_steps_per_run],
        ['Workspace estimate cap', `$${data.budget.max_estimated_cost_usd}`], ['Tokens per run', data.budget.max_tokens_per_run],
        ['Per-run estimate cap', `$${data.budget.max_run_estimated_cost_usd}`], ['Run duration seconds', data.budget.max_run_duration_seconds],
      ].map(([label, value]) => <div key={String(label)} className="rounded border border-white/10 p-2"><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl> : <p className="text-slate-400">No workspace quota budget is configured.</p>}
      <div><h4 className="mb-1 font-semibold">Provider quota policies</h4>{data.providers.length ? <ul className="space-y-1">{data.providers.map((quota) => <li key={`${quota.provider_key}:${quota.adapter_key}`} className="rounded border border-white/10 p-2">{quota.provider_key}/{quota.adapter_key} · concurrency {quota.max_concurrent_operations} · reserved ${quota.max_reserved_cost_usd} · daily ${quota.max_daily_cost_usd}</li>)}</ul> : <p className="text-slate-400">No provider quota policies configured.</p>}</div>
      <p className="text-[11px] text-amber-200">Configuration only. This view does not activate providers or make paid calls.</p>
    </div> : null}
    {loading && !data ? <p className="text-xs text-slate-400">Loading bounded workspace data…</p> : null}
  </section>;
}
