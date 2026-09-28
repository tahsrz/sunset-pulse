'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Budget = {
  maxConcurrentOperations: number;
  maxStepsPerRun: number;
  maxEstimatedCostUsd: number;
  maxTokensPerRun: number;
  maxRunEstimatedCostUsd: number;
  maxRunDurationSeconds: number;
  expectedRevision: number | null;
};

const initialBudget: Budget = {
  maxConcurrentOperations: 1,
  maxStepsPerRun: 25,
  maxEstimatedCostUsd: 1,
  maxTokensPerRun: 50000,
  maxRunEstimatedCostUsd: 1,
  maxRunDurationSeconds: 1800,
  expectedRevision: null,
};

const fields: Array<{ key: keyof Omit<Budget, 'expectedRevision'>; label: string; min: number; max: number; step?: number }> = [
  { key: 'maxConcurrentOperations', label: 'Concurrent capability operations', min: 1, max: 1000 },
  { key: 'maxStepsPerRun', label: 'Steps per run', min: 1, max: 10000 },
  { key: 'maxEstimatedCostUsd', label: 'Workspace reserved-cost ceiling (USD)', min: 0, max: 999999.999999, step: 0.01 },
  { key: 'maxTokensPerRun', label: 'Tokens per run', min: 0, max: 10000000 },
  { key: 'maxRunEstimatedCostUsd', label: 'Estimated cost per run (USD)', min: 0, max: 999999.999999, step: 0.01 },
  { key: 'maxRunDurationSeconds', label: 'Maximum run duration (seconds)', min: 1, max: 86400 },
];

type Props = { workspaceId: string };

export function QuotaBudgetPanel({ workspaceId }: Props) {
  const [budget, setBudget] = useState<Budget>(initialBudget);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/quotas`, { cache: 'no-store' });
        const body = await response.json();
        if (!active) return;
        if (response.status === 403) { setVisible(false); return; }
        if (!response.ok) throw new Error(body.error || 'Quota limits are unavailable.');
        const row = body.result;
        if (row) setBudget({
          maxConcurrentOperations: row.max_concurrent_operations,
          maxStepsPerRun: row.max_steps_per_run,
          maxEstimatedCostUsd: Number(row.max_estimated_cost_usd),
          maxTokensPerRun: row.max_tokens_per_run,
          maxRunEstimatedCostUsd: Number(row.max_run_estimated_cost_usd),
          maxRunDurationSeconds: row.max_run_duration_seconds,
          expectedRevision: row.revision,
        });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Quota limits are unavailable.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [workspaceId]);

  if (!visible) return <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">Quota controls are available to workspace owners and admins.</section>;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/quotas`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(budget),
      });
      const body = await response.json();
      if (response.status === 409) throw new Error('Quota settings changed elsewhere. Reload this workspace before saving.');
      if (!response.ok) throw new Error(body.error || 'Quota limits were not saved.');
      const row = body.result;
      setBudget((current) => ({ ...current, expectedRevision: row.revision }));
      setMessage('Quota limits saved. Provider execution is still disabled.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Quota limits were not saved.'); }
    finally { setSaving(false); }
  }

  async function reconcile() {
    setReconciling(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/quotas/reconcile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey: `capability-reconcile-${crypto.randomUUID()}` }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Reservation reconciliation could not be scheduled.');
      setMessage(`Scheduled one bounded cleanup batch (job ${body.result.id}). Each batch processes at most 100 expired reservations.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Reservation reconciliation could not be scheduled.'); }
    finally { setReconciling(false); }
  }

  return <section className="space-y-4 rounded-xl border border-amber-200/20 bg-slate-900/80 p-5">
    <div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Safety controls</p><h2 className="mt-1 text-lg font-bold">Workspace quota budget</h2><p className="mt-1 text-xs text-slate-400">Limits are enforced transactionally. Saving these settings does not enable a provider or external action.</p></div>
    {error ? <p role="alert" className="rounded border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}
    {message ? <p role="status" className="rounded border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-100">{message}</p> : null}
    {loading ? <p className="text-sm text-slate-400">Loading quota settings…</p> : <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ key, label, min, max, step }) => <label key={key} className="space-y-1 text-xs font-semibold text-slate-300">{label}
        <input type="number" required min={min} max={max} step={step ?? 1} value={budget[key]} onChange={(event) => setBudget((current) => ({ ...current, [key]: Number(event.target.value) }))} className="block w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
      </label>)}
      <div className="flex flex-wrap items-end gap-3 sm:col-span-2"><button disabled={saving} className="rounded-md bg-amber-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save quota limits'}</button><button type="button" disabled={reconciling || budget.expectedRevision === null} onClick={() => void reconcile()} className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-50">{reconciling ? 'Scheduling…' : 'Reconcile expired reservations'}</button><span className="text-xs text-slate-500">Revision {budget.expectedRevision ?? 'not configured'}</span></div>
    </form>}
  </section>;
}
