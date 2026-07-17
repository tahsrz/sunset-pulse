'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';

type StripeLedgerEvent = {
  eventId: string;
  eventType: string;
  objectId: string;
  livemode: boolean;
  status: 'processing' | 'succeeded' | 'failed';
  receivedAt: string;
  completedAt: string;
  failedAt: string;
  errorMessage: string;
  duplicateCount: number;
  stores: string[];
};

export default function StripeEventReconciliationPanel({ agentId }: { agentId: string }) {
  const [events, setEvents] = useState<StripeLedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayingEventId, setReplayingEventId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/stripe-events?agentId=${encodeURIComponent(agentId)}&limit=8`, {
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.error) {
        throw new Error(body.message || 'Stripe events failed to load.');
      }

      setEvents(body.data?.events || []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Stripe events failed to load.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function replayEvent(eventId: string) {
    setReplayingEventId(eventId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/stripe-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, eventId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.error) {
        throw new Error(body.message || 'Stripe event replay failed.');
      }

      setMessage(`${body.data?.eventType || 'Stripe event'} reconciled.`);
      await loadEvents();
    } catch (replayError: any) {
      setError(replayError?.message || 'Stripe event replay failed.');
    } finally {
      setReplayingEventId('');
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Stripe Events</p>
          <h3 className="mt-1 text-sm font-black text-white">Replay & Reconcile</h3>
        </div>
        <button
          type="button"
          onClick={loadEvents}
          disabled={loading || Boolean(replayingEventId)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title="Refresh Stripe events"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-100">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold leading-5 text-emerald-100">{message}</p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {loading ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-xs font-bold text-slate-500">Loading Stripe event ledger...</p>
        ) : events.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-xs font-bold leading-5 text-slate-500">
            No recorded Stripe events for this site yet.
          </p>
        ) : events.map((event) => (
          <div key={event.eventId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusIcon status={event.status} />
                  <p className="truncate text-xs font-black text-white">{event.eventType}</p>
                  {event.livemode ? <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">Live</span> : null}
                </div>
                <p className="mt-2 truncate font-mono text-[10px] text-slate-500">{event.eventId}</p>
                <p className="mt-1 truncate font-mono text-[10px] text-slate-600">{event.objectId || 'No object id'} / {formatShortDate(event.receivedAt)}</p>
                {event.errorMessage ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-100/80">{event.errorMessage}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => replayEvent(event.eventId)}
                disabled={Boolean(replayingEventId)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {replayingEventId === event.eventId ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Replay
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusIcon({ status }: { status: StripeLedgerEvent['status'] }) {
  if (status === 'succeeded') return <CheckCircle2 size={14} className="shrink-0 text-emerald-300" />;
  if (status === 'failed') return <AlertTriangle size={14} className="shrink-0 text-red-300" />;
  return <Loader2 size={14} className="shrink-0 text-amber-200" />;
}

function formatShortDate(value: string) {
  if (!value) return 'time unknown';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'time unknown';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
