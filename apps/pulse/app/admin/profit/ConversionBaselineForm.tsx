'use client';

import { useEffect, useState } from 'react';

export default function ConversionBaselineForm() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<{ handoffPercent: number; appointmentPercent: number; windowStart: string; windowEnd: string } | null>(null);
  useEffect(() => { fetch('/api/admin/profit/baseline').then((response) => response.json()).then((result) => { if (result.ok && result.baseline) setCurrent(result.baseline); }).catch(() => undefined); }, []);
  async function submit(formData: FormData) {
    setPending(true); setMessage('');
    const response = await fetch('/api/admin/profit/baseline', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(formData)) });
    const result = await response.json();
    setMessage(result.ok ? 'Baseline saved.' : result.error || 'Unable to save baseline.'); setPending(false);
  }
  return <form action={submit} className="mt-6 border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Conversion baseline</h2><p className="mt-2 text-xs text-slate-400">Seed the approved comparison cohort before the 14-day shadow window.</p>{current ? <p className="mt-3 text-xs text-cyan-200">Active baseline: {current.handoffPercent}% handoff · {current.appointmentPercent}% appointment · {current.windowStart.slice(0, 10)} to {current.windowEnd.slice(0, 10)}</p> : <p className="mt-3 text-xs text-amber-200">No baseline seeded.</p>}<div className="mt-4 grid gap-3 md:grid-cols-4"><input name="windowStart" type="datetime-local" required className="border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white" aria-label="Baseline window start" /><input name="windowEnd" type="datetime-local" required className="border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white" aria-label="Baseline window end" /><input name="handoffPercent" type="number" min="0" step="0.01" required placeholder="Handoff %" className="border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white" /><input name="appointmentPercent" type="number" min="0" step="0.01" required placeholder="Appointment %" className="border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white" /></div><div className="mt-4 flex items-center gap-3"><button type="submit" disabled={pending} className="bg-cyan-300 px-4 py-2 text-xs font-black uppercase text-slate-950 disabled:opacity-50">{pending ? 'Saving...' : 'Save baseline'}</button>{message ? <span className="text-xs text-slate-400">{message}</span> : null}</div></form>;
}
