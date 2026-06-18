'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Code2,
  Database,
  FileText,
  Globe2,
  Loader2,
  MapPinned,
  Network,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  TerminalSquare,
  Workflow,
  XCircle
} from 'lucide-react';
import type { OrchestratorCommandResult } from '@/lib/core/orchestrator_commands';
import type { TerminalIntentActionResult } from '@/lib/core/orchestrator_terminal_runner';
import type { OrchestratorBrowserCheck, OrchestratorSnapshot } from '@/lib/core/orchestrator_node';
import type { MlsSyncRun } from '@/lib/data/mlsSyncLedger';

type OrchestratorConsoleProps = {
  initialSnapshot: OrchestratorSnapshot;
};

export function OrchestratorConsole({ initialSnapshot }: OrchestratorConsoleProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [check, setCheck] = useState<OrchestratorBrowserCheck | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [terminalBusyId, setTerminalBusyId] = useState('');
  const [mlsSyncing, setMlsSyncing] = useState(false);
  const [hotsheetImporting, setHotsheetImporting] = useState(false);
  const [commandText, setCommandText] = useState('/status');
  const [mlsCity, setMlsCity] = useState('Dallas');
  const [hotsheetText, setHotsheetText] = useState('');
  const [commandResult, setCommandResult] = useState<OrchestratorCommandResult | null>(null);
  const [terminalActionResult, setTerminalActionResult] = useState<TerminalIntentActionResult | null>(null);
  const [mlsRunResult, setMlsRunResult] = useState<MlsSyncRun | null>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orchestrator/status', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Status refresh failed.');
      setSnapshot(body.data.snapshot);
    } catch (err: any) {
      setError(err.message || 'Status refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  const runBrowserCheck = async () => {
    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orchestrator/browser-check', {
        method: 'POST',
        cache: 'no-store'
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Browser check failed.');
      setCheck(body.data.check);
    } catch (err: any) {
      setError(err.message || 'Browser check failed.');
    } finally {
      setChecking(false);
    }
  };

  const sendCommand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSendingCommand(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orchestrator/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commandText }),
        cache: 'no-store'
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Command routing failed.');
      setCommandResult(body.data.result);
      setSnapshot(body.data.snapshot);
    } catch (err: any) {
      setError(err.message || 'Command routing failed.');
    } finally {
      setSendingCommand(false);
    }
  };

  const handleTerminalAction = async (id: string, action: 'approve' | 'reject' | 'run') => {
    setTerminalBusyId(`${id}:${action}`);
    setError('');
    try {
      const response = await fetch(`/api/admin/orchestrator/terminal-intents/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        cache: 'no-store'
      });
      const body = await response.json();
      if (!response.ok && !body?.data?.result) throw new Error(body.message || 'Terminal action failed.');
      setTerminalActionResult(body.data.result);
      setSnapshot(body.data.snapshot);
    } catch (err: any) {
      setError(err.message || 'Terminal action failed.');
    } finally {
      setTerminalBusyId('');
    }
  };

  const runMlsSync = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMlsSyncing(true);
    setError('');
    try {
      const params = mlsCity.trim() ? { city: mlsCity.trim(), pageSize: 20 } : { pageSize: 20 };
      const response = await fetch('/api/admin/mls/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
        cache: 'no-store'
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'MLS sync failed.');
      applyMlsRun(body.data.run);
    } catch (err: any) {
      setError(err.message || 'MLS sync failed.');
    } finally {
      setMlsSyncing(false);
    }
  };

  const importHotsheet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHotsheetImporting(true);
    setError('');
    try {
      const response = await fetch('/api/admin/mls/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'hotsheet',
          label: 'Command Post hotsheet import',
          text: hotsheetText
        }),
        cache: 'no-store'
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Hotsheet import failed.');
      applyMlsRun(body.data.run);
      setHotsheetText('');
    } catch (err: any) {
      setError(err.message || 'Hotsheet import failed.');
    } finally {
      setHotsheetImporting(false);
    }
  };

  const applyMlsRun = (run: MlsSyncRun) => {
    setMlsRunResult(run);
    setSnapshot(previous => ({
      ...previous,
      mlsSync: {
        ...previous.mlsSync,
        latest: run,
        latestCompleted: run.status === 'completed' ? run : previous.mlsSync.latestCompleted,
        runningCount: Math.max(0, previous.mlsSync.runningCount - 1),
        recentRuns: [run, ...previous.mlsSync.recentRuns.filter(item => item.id !== run.id)].slice(0, 10)
      }
    }));
  };

  return (
    <main className="min-h-screen bg-[#071013] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/10 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                <Workflow className="h-4 w-4" />
                Central Node
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Orchestrator Control Room</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Operator view for Telegram routing, model delegation, guarded tools, process grouping, and Playwright-style checks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:border-cyan-200 disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </button>
              <button
                type="button"
                onClick={runBrowserCheck}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
              >
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Check
              </button>
            </div>
          </div>
          {error && <p className="mt-4 rounded border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Access" value={snapshot.access.mode} detail={snapshot.access.reason} />
          <Metric icon={<Bot className="h-5 w-5" />} label="Telegram" value={snapshot.telegram.configured ? 'Configured' : 'Needs token'} detail={`${snapshot.telegram.webhookPath} / shell ${snapshot.telegram.shellPrefix}`} />
          <Metric icon={<Database className="h-5 w-5" />} label="Master Archive" value={snapshot.masterArchive.status} detail={`${snapshot.masterArchive.sourceCount} sources / ${snapshot.masterArchive.shardCount} shards`} />
          <Metric icon={<Network className="h-5 w-5" />} label="Pending Terminal" value={String(snapshot.commandQueue.pendingTerminalIntentCount)} detail={`${snapshot.bridge.groups.length} bridge groups detected`} />
          <Metric icon={<Upload className="h-5 w-5" />} label="MLS Sync" value={snapshot.mlsSync.latest?.status || 'idle'} detail={formatMlsRunDetail(snapshot.mlsSync.latest)} />
        </section>

        <section className="mt-6">
          <Panel title="MLS Sync" icon={<Database className="h-5 w-5" />}>
            <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
              <div className="space-y-3">
                <div className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">Latest Run</p>
                      <p className="mt-1 font-mono text-xs text-cyan-100">{snapshot.mlsSync.latest?.id || 'none'}</p>
                    </div>
                    <StatusPill status={snapshot.mlsSync.latest?.status || 'pending'} label={snapshot.mlsSync.latest?.status || 'idle'} />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <MlsCount label="Received" value={snapshot.mlsSync.latest?.metrics.received || 0} />
                    <MlsCount label="Synced" value={snapshot.mlsSync.latest?.metrics.synced || 0} />
                    <MlsCount label="Skipped" value={snapshot.mlsSync.latest?.metrics.skipped || 0} />
                    <MlsCount label="Failed" value={snapshot.mlsSync.latest?.metrics.failed || 0} />
                  </div>
                  {mlsRunResult && (
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {mlsRunResult.provider} run finished with {mlsRunResult.metrics.synced} synced and {mlsRunResult.metrics.failed} failed.
                    </p>
                  )}
                </div>

                <div className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black text-white">Recent Runs</p>
                  <div className="mt-3 space-y-2">
                    {snapshot.mlsSync.recentRuns.length === 0 ? (
                      <p className="text-sm text-slate-400">No MLS sync runs recorded.</p>
                    ) : snapshot.mlsSync.recentRuns.slice(0, 4).map(run => (
                      <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-black/25 px-3 py-2">
                        <div>
                          <p className="font-mono text-xs text-white">{run.provider}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</p>
                        </div>
                        <StatusPill status={run.status} label={`${run.metrics.synced}/${run.metrics.received}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <form onSubmit={runMlsSync} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-white">
                    <RefreshCw className="h-4 w-4 text-cyan-100" />
                    Provider Sync
                  </p>
                  <label className="mt-4 block text-xs font-black uppercase tracking-[0.16em] text-slate-500" htmlFor="mls-city">City</label>
                  <input
                    id="mls-city"
                    value={mlsCity}
                    onChange={event => setMlsCity(event.target.value)}
                    className="mt-2 min-h-10 w-full rounded border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200"
                    placeholder="Dallas"
                  />
                  <button
                    type="submit"
                    disabled={mlsSyncing}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
                  >
                    {mlsSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Run Sync
                  </button>
                </form>

                <form onSubmit={importHotsheet} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-white">
                    <FileText className="h-4 w-4 text-cyan-100" />
                    Hotsheet Import
                  </p>
                  <textarea
                    value={hotsheetText}
                    onChange={event => setHotsheetText(event.target.value)}
                    className="mt-4 min-h-28 w-full resize-y rounded border border-white/10 bg-black/35 px-3 py-2 font-mono text-xs leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200"
                    placeholder="Paste daily hotsheet text"
                  />
                  <button
                    type="submit"
                    disabled={hotsheetImporting || !hotsheetText.trim()}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border border-white/15 px-4 py-2 text-sm font-black text-white transition hover:border-cyan-200 disabled:opacity-50"
                  >
                    {hotsheetImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Import
                  </button>
                </form>
              </div>
            </div>
            {snapshot.mlsSync.latest?.failures?.length ? (
              <div className="mt-4 rounded border border-red-300/20 bg-red-500/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100">Recent MLS Failures</p>
                <div className="mt-3 space-y-2">
                  {snapshot.mlsSync.latest.failures.slice(0, 3).map(failure => (
                    <p key={`${failure.at}:${failure.mls_id}:${failure.error}`} className="font-mono text-xs leading-5 text-red-100">
                      {failure.mls_id || 'provider'}: {failure.error}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Panel title="Command Console" icon={<TerminalSquare className="h-5 w-5" />}>
            <form onSubmit={sendCommand} className="flex flex-col gap-3 md:flex-row">
              <input
                value={commandText}
                onChange={event => setCommandText(event.target.value)}
                className="min-h-11 flex-1 rounded border border-white/10 bg-black/35 px-3 py-2 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200"
                placeholder="/status, /places, /tah Sunset, !git status"
              />
              <button
                type="submit"
                disabled={sendingCommand}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
              >
                {sendingCommand ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </form>
            {commandResult && (
              <div className="mt-4 rounded border border-white/10 bg-black/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={commandResult.ok ? 'passed' : 'failed'} label={commandResult.action} />
                  {commandResult.requiresConfirmation && <StatusPill status="pending" label="review" />}
                </div>
                <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">{commandResult.reply}</pre>
              </div>
            )}
          </Panel>

          <Panel title="Terminal Queue" icon={<ClipboardList className="h-5 w-5" />}>
            {terminalActionResult && (
              <div className="mb-3 rounded border border-white/10 bg-black/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={terminalActionResult.ok ? 'passed' : 'failed'} label={terminalActionResult.action} />
                  {terminalActionResult.intent && <StatusPill status="pending" label={terminalActionResult.intent.status} />}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{terminalActionResult.message}</p>
              </div>
            )}
            <div className="space-y-3">
              {snapshot.commandQueue.recentTerminalIntents.length === 0 ? (
                <p className="rounded border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">No terminal intents queued.</p>
              ) : snapshot.commandQueue.recentTerminalIntents.map(intent => (
                <div key={intent.id} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs text-cyan-100">{intent.id}</p>
                    <StatusPill status={intent.status} label={`${intent.status} / ${intent.riskLevel}`} />
                  </div>
                  <p className="mt-2 break-words font-mono text-sm text-white">{intent.command}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{intent.reason}</p>
                  {(intent.stdout || intent.stderr || intent.executionError) && (
                    <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-black/35 p-3 font-mono text-xs leading-5 text-slate-200">
                      {[intent.stdout, intent.stderr, intent.executionError].filter(Boolean).join('\n')}
                    </pre>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {intent.status === 'pending' && intent.riskLevel !== 'low' && intent.riskLevel !== 'high' && (
                      <QueueButton
                        label="Approve"
                        icon={<Check className="h-3.5 w-3.5" />}
                        busy={terminalBusyId === `${intent.id}:approve`}
                        onClick={() => handleTerminalAction(intent.id, 'approve')}
                      />
                    )}
                    {(intent.status === 'pending' || intent.status === 'approved') && intent.riskLevel !== 'high' && (
                      <QueueButton
                        label="Run"
                        icon={<Play className="h-3.5 w-3.5" />}
                        busy={terminalBusyId === `${intent.id}:run`}
                        onClick={() => handleTerminalAction(intent.id, 'run')}
                        emphasis
                      />
                    )}
                    {(intent.status === 'pending' || intent.status === 'approved') && (
                      <QueueButton
                        label="Reject"
                        icon={<XCircle className="h-3.5 w-3.5" />}
                        busy={terminalBusyId === `${intent.id}:reject`}
                        onClick={() => handleTerminalAction(intent.id, 'reject')}
                      />
                    )}
                    {intent.riskLevel === 'high' && (intent.status === 'pending' || intent.status === 'approved') && (
                      <span className="inline-flex items-center rounded border border-red-300/30 px-3 py-2 text-xs font-bold text-red-100">
                        Manual execution only
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Panel title="Command Router" icon={<TerminalSquare className="h-5 w-5" />}>
            <div className="grid gap-3 md:grid-cols-3">
              {snapshot.commandRouter.modes.map(mode => (
                <div key={mode.mode} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{mode.mode}</p>
                  <p className="mt-2 font-mono text-sm text-white">{mode.trigger}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{mode.behavior}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Terminal Policy</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {snapshot.commandRouter.terminalPolicy.map(policy => (
                  <p key={policy} className="flex gap-2 text-sm leading-6 text-slate-300">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                    {policy}
                  </p>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Browser Check" icon={<Globe2 className="h-5 w-5" />}>
            <div className="space-y-3">
              {(check?.steps || snapshot.browserChecks.map(item => ({
                label: item.label,
                target: item.route,
                assertion: item.assertion,
                status: 'pending',
                detail: 'Not run in this session.'
              }))).map(step => (
                <div key={`${step.label}:${step.target}`} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{step.label}</p>
                      <p className="mt-1 font-mono text-xs text-cyan-100">{step.target}</p>
                    </div>
                    <StatusPill status={step.status} />
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">{step.assertion}</p>
                  <p className="mt-2 text-sm text-slate-300">{step.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Model Network" icon={<BrainCircuit className="h-5 w-5" />}>
            <div className="grid gap-3">
              {snapshot.modelNetwork.map(model => (
                <div key={model.id} className="grid gap-3 rounded border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[120px,1fr,auto] md:items-center">
                  <div>
                    <p className="font-mono text-sm text-white">{model.id}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{model.role}</p>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{model.bestFor}</p>
                  <StatusPill status={model.configured ? 'passed' : 'failed'} label={model.configured ? 'ready' : 'config'} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Tool Gateway" icon={<Code2 className="h-5 w-5" />}>
            <div className="grid gap-3">
              {snapshot.toolGateway.map(tool => (
                <div key={tool.id} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{tool.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{tool.detail}</p>
                    </div>
                    <StatusPill status={tool.status === 'ready' ? 'passed' : tool.status === 'guarded' ? 'pending' : 'failed'} label={tool.status} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr,0.8fr]">
          <Panel title="Bridge Sessions" icon={<Activity className="h-5 w-5" />}>
            <p className="mb-4 text-sm leading-6 text-slate-300">{snapshot.bridge.note}</p>
            <div className="space-y-3">
              {snapshot.bridge.groups.length === 0 ? (
                <p className="rounded border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">No bridge-like process groups detected.</p>
              ) : snapshot.bridge.groups.map(group => (
                <div key={group.id} className="rounded border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm text-white">root pid {group.rootPid}</p>
                    <span className="rounded bg-cyan-300 px-2 py-1 text-xs font-black text-slate-950">{group.processCount} processes</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{group.processNames.join(', ')}</p>
                  <div className="mt-3 space-y-1">
                    {group.commandHints.map(hint => (
                      <p key={hint} className="truncate font-mono text-xs text-slate-400">{hint}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="BotFather Menu" icon={<ClipboardList className="h-5 w-5" />}>
            <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-slate-200">
              {snapshot.commandRouter.botFatherCommands.map(command => (
                <div key={command.command}>{command.command} - {command.description}</div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <Link className="inline-flex items-center gap-2 rounded bg-cyan-300 px-3 py-2 text-slate-950" href="/api/tah/master">
                <Database className="h-4 w-4" />
                Master API
              </Link>
              <Link className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-white" href="/api/tah/master/places">
                <MapPinned className="h-4 w-4" />
                Places
              </Link>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded border border-white/10 bg-black/25 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2 text-cyan-100">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-black capitalize text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function MlsCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-black/30 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function formatMlsRunDetail(run: MlsSyncRun | null) {
  if (!run) return 'No sync runs recorded.';
  return `${run.provider}: ${run.metrics.synced}/${run.metrics.received} synced, ${run.metrics.failed} failed`;
}

function QueueButton({ label, icon, busy, onClick, emphasis = false }: { label: string; icon: React.ReactNode; busy: boolean; onClick: () => void; emphasis?: boolean }) {
  const classes = emphasis
    ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
    : 'border border-white/15 text-white hover:border-cyan-200';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex min-h-9 items-center gap-2 rounded px-3 py-2 text-xs font-black transition disabled:opacity-50 ${classes}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function StatusPill({ status, label }: { status: string; label?: string }) {
  const normalized = status === 'passed' || status === 'completed' || status === 'approved'
    ? 'ready'
    : status === 'failed' || status === 'rejected' || status === 'cancelled'
      ? 'attention'
      : 'pending';
  const classes = normalized === 'ready'
    ? 'bg-emerald-300 text-slate-950'
    : normalized === 'attention'
      ? 'bg-red-300 text-slate-950'
      : 'bg-amber-200 text-slate-950';

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${classes}`}>
      {normalized === 'ready' ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
      {label || normalized}
    </span>
  );
}
