'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, RefreshCw, WifiOff } from 'lucide-react';
import { mergeIntelligenceEvents, type AgentAlert, type IntelligenceEvent } from '@/lib/intelligence/agentAlerts';
import { subscribeToEvents, supabase } from '@/lib/supabase';

type ConnectionStatus = 'connecting' | 'live' | 'polling' | 'error';

export default function AgentLeadAlerts() {
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const cursorRef = useRef<string | null>(null);
  const dismissedRef = useRef(new Set<string>());
  const fetchingRef = useRef(false);

  const hydrate = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (cursorRef.current) params.set('after', cursorRef.current);
      const response = await fetch(`/api/admin/agent-leads/alerts?${params}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        events?: IntelligenceEvent[];
        cursor?: string | null;
      } | null;
      if (!response.ok || !payload?.ok) throw new Error('Alert hydration failed.');
      setAlerts((current) => mergeIntelligenceEvents(current, payload.events || [], dismissedRef.current));
      cursorRef.current = payload.cursor || cursorRef.current;
      setStatus((current) => current === 'live' ? 'live' : 'polling');
    } catch {
      setStatus('error');
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void hydrate();
    const subscription = subscribeToEvents(
      () => void hydrate(),
      (nextStatus: string) => {
        if (nextStatus === 'SUBSCRIBED') {
          setStatus('live');
          void hydrate();
        } else if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
          setStatus('polling');
        }
      },
    );
    const poll = window.setInterval(() => void hydrate(), 30_000);
    const catchUp = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void hydrate();
    };
    window.addEventListener('online', catchUp);
    document.addEventListener('visibilitychange', catchUp);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('online', catchUp);
      document.removeEventListener('visibilitychange', catchUp);
      if (subscription) void supabase.removeChannel(subscription);
    };
  }, [hydrate]);

  const dismiss = (alert: AgentAlert) => {
    alert.sourceEventIds.forEach((eventId) => dismissedRef.current.add(eventId));
    setAlerts((current) => current.filter((item) => item.id !== alert.id));
  };

  return (
    <section className="mb-8 border-y border-amber-300/20 bg-amber-300/[0.025] py-5" aria-labelledby="agent-alerts-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BellRing size={18} className="text-amber-200" />
          <div>
            <h2 id="agent-alerts-heading" className="text-xs font-black uppercase tracking-[0.2em] text-amber-100">Live lead alerts</h2>
            <p className="mt-1 text-xs text-slate-500">High-intent activity and Jamie handoffs.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {status === 'error' ? <WifiOff size={13} /> : <RefreshCw size={13} className={status === 'connecting' ? 'animate-spin' : ''} />}
          {status === 'live' ? 'Live' : status === 'error' ? 'Retrying' : status === 'polling' ? 'Catch-up active' : 'Connecting'}
        </div>
      </div>

      {alerts.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {alerts.slice(0, 8).map((alert) => (
            <article key={alert.id} className="border border-amber-300/20 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white">{alert.title}</h3>
                    {alert.occurrences > 1 ? <span className="text-[10px] font-bold text-amber-200">{alert.occurrences} signals</span> : null}
                    {alert.notificationStatus ? (
                      <span className={`text-[9px] font-black uppercase tracking-[0.12em] ${notificationStatusColor(alert.notificationStatus)}`}>
                        Notify: {alert.notificationStatus}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{alert.detail}</p>
                </div>
                <button type="button" onClick={() => dismiss(alert)} className="shrink-0 p-2 text-slate-500 transition hover:text-white" aria-label={`Dismiss ${alert.title}`} title="Dismiss for this session">
                  <Check size={15} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{formatAlertTime(alert.lastUpdatedAt)}</span>
                <Link href={alert.actionHref} className="text-xs font-black text-amber-200 transition hover:text-amber-100">Open lead queue</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No active high-intent alerts.</p>
      )}
    </section>
  );
}

function formatAlertTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';
}

function notificationStatusColor(status: NonNullable<AgentAlert['notificationStatus']>) {
  if (status === 'sent') return 'text-emerald-300';
  if (status === 'failed') return 'text-red-300';
  if (status === 'suppressed') return 'text-slate-500';
  return 'text-cyan-300';
}
