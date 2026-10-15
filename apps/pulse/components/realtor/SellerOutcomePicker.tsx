'use client';

import React, { useEffect, useState } from 'react';
import { sellerOutcomePageResultSchema, type SellerOutcomeKind, type SellerOutcomePage } from '@/lib/realtor-workspace/leadContracts';

export function SellerOutcomePicker({ leadId, kind, timeZone, disabled, actionDisabled = false, actionLabel, onAction }: {
  leadId: string; kind: SellerOutcomeKind; timeZone: string; disabled: boolean;
  actionDisabled?: boolean;
  actionLabel?: string;
  onAction: (eventId: string, event: SellerOutcomePage['events'][number]) => void;
}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ query: string; data?: SellerOutcomePage; error?: string } | null>(null);
  const query = new URLSearchParams({ leadId, kind, ...(cursor ? { cursor } : {}) }).toString();
  const page = result?.query === query ? result.data : undefined;
  const error = result?.query === query ? result.error : undefined;
  const selected = page?.events.find((event) => event.id === selectedId) || page?.events[0];
  const noun = kind === 'consultation' ? 'consultations' : 'closings';

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/realtor/leads/outcomes?${query}`, {
          signal: controller.signal, cache: 'no-store',
        });
        const body = await response.json();
        if (!response.ok || !body?.ok) throw new Error(body?.error || `Unable to load recorded ${noun}.`);
        const parsed = sellerOutcomePageResultSchema.safeParse(body.result);
        if (!parsed.success) throw new Error('Recorded outcomes could not be read. Try again.');
        if (!controller.signal.aborted) setResult({ query, data: parsed.data });
      } catch (reason) {
        if (!controller.signal.aborted) setResult({ query, error: reason instanceof Error
          ? reason.message : `Unable to load recorded ${noun}.` });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, retry, noun]);

  if (error) return <div className="mt-2">
    <p role="alert" className="text-xs text-rose-200">Recorded {noun} could not be loaded. {error}</p>
    <button type="button" disabled={disabled} onClick={() => { setResult(null); setRetry((value) => value + 1); }}
      className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs">Retry {noun}</button>
  </div>;
  if (!page) return <p role="status" className="mt-2 text-xs text-slate-400">Loading recorded {noun}…</p>;

  return <div className="mt-2 space-y-2">
    {selected ? <>
      <label className="block text-xs text-slate-300">
        {kind === 'consultation' ? 'Confirmed consultation' : 'Closing record to void'}
        <select value={selected.id} disabled={disabled} onChange={(event) => setSelectedId(event.target.value)}
          className="mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-xs text-white">
          {page.events.map((event) => <option key={event.id} value={event.id}>
            {kind === 'consultation' ? new Date(event.occurred_at).toLocaleString(undefined, { timeZone })
              : `${String(event.details.reference || 'Transaction')} · ${String(event.details.closedOn || '')}`}
          </option>)}
        </select>
      </label>
      <button type="button" disabled={disabled || actionDisabled} onClick={() => onAction(selected.id, selected)}
        className="rounded-lg border border-amber-200/30 px-3 py-2 text-xs text-amber-100 disabled:opacity-50">
        {actionLabel || (kind === 'consultation' ? 'Record cancellation' : 'Void closing record')}
      </button>
    </> : <p className="text-xs text-slate-500">{cursor ? 'No more active records on this page.'
      : kind === 'consultation' ? 'No active consultation is recorded.' : 'No active closing record to correct.'}</p>}
    <div className="flex flex-wrap gap-2">
      {page.nextCursor ? <button type="button" disabled={disabled} onClick={() => setCursor(page.nextCursor)}
        className="rounded-lg border border-white/15 px-3 py-2 text-xs">Load older {noun}</button> : null}
      {cursor ? <button type="button" disabled={disabled} onClick={() => setCursor(null)}
        className="rounded-lg border border-white/15 px-3 py-2 text-xs">Back to latest {noun}</button> : null}
    </div>
  </div>;
}
