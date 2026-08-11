'use client';

import { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, CircleAlert, Loader2, TerminalSquare } from 'lucide-react';

type ProcessSnapshot = {
  generatedAt: string;
  worker: { running: boolean; processes: Array<{ pid: number; parentPid: number; name: string; commandLine: string }> };
  scheduler: { registered: boolean; state: string; lastRunTime: string | null; lastTaskResult: number | null };
  ingestion: { state: Record<string, unknown> | null; log: string[] };
  remoteHeartbeat: { crawlerId: string; status: string; updatedAt: string; payload: Record<string, unknown> } | null;
};

export default function WikipediaProcessTerminal() {
  const [snapshot, setSnapshot] = useState<ProcessSnapshot | null>(null);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch('/api/atlas/processes', { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Operator access required.');
        if (!cancelled) {
          setSnapshot(body.data.snapshot);
          setError('');
        }
      } catch (refreshError) {
        if (!cancelled) setError(refreshError instanceof Error ? refreshError.message : 'Process monitor unavailable.');
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const state = snapshot?.ingestion.state || (snapshot?.remoteHeartbeat?.payload.state as Record<string, unknown> | undefined);
  const remote = snapshot?.remoteHeartbeat;
  const progress = state ? `${state.importedCount || 0} imported · ${state.enumeratedCount || 0} enumerated` : 'Waiting for checkpoint';

  return (
    <section className="mt-4 rounded border border-emerald-200/20 bg-[#020707]/90 p-3 font-mono shadow-2xl shadow-black/20">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
          <TerminalSquare className="h-4 w-4" /> Process Terminal
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-[11px] leading-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-2 text-slate-300"><Activity className="h-3.5 w-3.5" /> wikipedia:crawl</span>
            <span className={snapshot?.worker.running || remote?.status === 'imported' ? 'text-emerald-300' : 'text-red-300'}>{snapshot?.worker.running || remote?.status === 'imported' ? 'RUNNING' : 'STOPPED'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <span>task: <b className="text-slate-200">{snapshot?.scheduler.state || 'checking'}</b></span>
            <span>articles: <b className="text-slate-200">{progress}</b></span>
            <span>cursor: <b className="text-cyan-200">{String(state?.continuation || 'none')}</b></span>
            <span>retries: <b className="text-amber-200">{String(state?.retryQueue ? (state.retryQueue as unknown[]).length : 0)}</b></span>
          </div>
          {snapshot?.worker.processes.map(process => (
            <div key={process.pid} className="rounded border border-white/10 bg-white/[0.04] p-2 text-slate-400">
              <p className="text-emerald-200">pid {process.pid} · parent {process.parentPid} · {process.name}</p>
              <p className="mt-1 truncate text-slate-500">{process.commandLine}</p>
            </div>
          ))}
          {remote && <p className="border-t border-white/10 pt-2 text-slate-500">remote heartbeat: {new Date(remote.updatedAt).toLocaleTimeString()}</p>}
          {error && <p className="flex items-start gap-2 text-amber-200"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
          {!snapshot && !error && <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> attaching to local monitor...</p>}
          {snapshot?.ingestion.log.length ? (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words border-t border-white/10 pt-2 text-[10px] text-slate-500">{snapshot.ingestion.log.slice(-12).join('\n')}</pre>
          ) : null}
        </div>
      )}
    </section>
  );
}
