'use client';

import { useState } from 'react';

export function DisputeCreditForm({ outcomeId }: { outcomeId: string }) {
  const [reason, setReason] = useState('duplicate_lead'); const [message, setMessage] = useState('');
  async function submit() {
    setMessage('Submitting...');
    const response = await fetch('/api/admin/profit/outcomes/credit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcomeId, reason, evidence: { source: 'profit_console' } }) });
    const body = await response.json(); setMessage(response.ok ? 'Credit recorded.' : body.error || 'Credit failed.');
  }
  return <div className="mt-3 flex flex-wrap items-center gap-2"><select value={reason} onChange={(event) => setReason(event.target.value)} className="border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-200"><option value="duplicate_lead">Duplicate lead</option><option value="invalid_contact">Invalid contact</option><option value="failed_delivery">Failed delivery</option><option value="test_traffic">Test traffic</option><option value="fraud_or_abuse">Fraud or abuse</option><option value="agent_generated">Agent generated</option><option value="booking_cancelled">Booking cancelled</option></select><button type="button" onClick={() => void submit()} className="border border-rose-300/30 px-2 py-1 text-xs font-bold text-rose-200">Issue credit</button>{message ? <span className="text-xs text-slate-400">{message}</span> : null}</div>;
}
