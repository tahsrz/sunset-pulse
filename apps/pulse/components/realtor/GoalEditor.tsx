'use client';

import { useEffect, useState } from 'react';
import { parseUsdToCents } from '@/lib/realtor-workspace/money';

type Goal = { id: string; metric: 'net_income' | 'closings' | 'weekly_reviews'; target: number; revision: number };
const inputClass = 'w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none';

export function GoalEditor({ goals, year, busy, submit, hidden }: {
  goals: Goal[];
  year: number;
  busy: boolean;
  hidden: boolean;
  submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>;
}) {
  const [metric, setMetric] = useState<Goal['metric']>('net_income');
  const matchingGoal = goals.find((goal) => goal.metric === metric);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setTarget(matchingGoal ? metric === 'net_income' ? (matchingGoal.target / 100).toFixed(2) : String(matchingGoal.target) : '');
  }, [matchingGoal, metric]);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    let amount: number;
    try {
      amount = metric === 'net_income' ? parseUsdToCents(target) : Number(target);
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a positive whole-number target.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the target.'); return; }
    void submit('/api/realtor/goals', 'POST', {
      id: matchingGoal?.id || null, metric, year, target: amount,
      expectedRevision: matchingGoal?.revision ?? null, requestKey: crypto.randomUUID(),
    }, matchingGoal ? 'Goal updated.' : 'Goal saved.');
  };

  return <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
    <h2 className="mb-4 text-lg font-bold text-white">Set a personal target</h2>
    {error ? <p role="alert" className="mb-3 text-sm text-rose-200">{error}</p> : null}
    {hidden ? <p className="text-sm text-slate-400">Progress features are turned off. Enable them in Today personal settings to set a goal.</p> : <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-medium text-slate-200">What do you want to track?<span className="mt-1.5 block"><select value={metric} onChange={(event) => setMetric(event.target.value as Goal['metric'])} className={inputClass}><option value="net_income">Annual recorded net income</option><option value="closings">Recorded closings</option><option value="weekly_reviews">Weekly business reviews</option></select></span></label>
      <label className="block text-sm font-medium text-slate-200">{metric === 'net_income' ? 'Goal amount (USD)' : 'Goal count'}<span className="mt-1.5 block"><input required inputMode={metric === 'net_income' ? 'decimal' : 'numeric'} value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass} placeholder={metric === 'net_income' ? '100,000.00' : '24'} /></span></label>
      <button type="submit" disabled={busy} className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{matchingGoal ? 'Update goal' : 'Save goal'}</button>
    </form>}
  </section>;
}
