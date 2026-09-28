'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { canvasLayoutSchema, type CanvasLayout } from '@/lib/platform/contracts/canvasLayout';
import { CommandPalette } from './CommandPalette';
import { CoordinatePlane } from './CoordinatePlane';
import { PlatformInbox } from './PlatformInbox';
import { RunDetail } from './RunDetail';
import { SystemMonitorWindow } from './SystemMonitorWindow';
import { WindowFrame } from './WindowFrame';

type RunSummary = { id: string; status: string; definition: { key: string; version: number } };
type LayoutRecord = { layout: CanvasLayout; revision: number } | null;

function defaultLayout(workspaceId: string): CanvasLayout {
  return {
    schemaVersion: 1,
    workspaceId,
    viewport: { x: 0, y: 0, zoom: 1 },
    windows: [{
      window: { id: crypto.randomUUID(), kind: 'checkpoint_inbox', target: { workspaceId } },
      x: 16, y: 16, width: 880, height: 680, zIndex: 1,
    }],
  };
}

export function CanvasOS({ workspaceId }: { workspaceId: string }) {
  const [layout, setLayout] = useState<CanvasLayout | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [selectedMonitorPanel, setSelectedMonitorPanel] = useState<'scheduler' | 'connectors' | 'quotas'>('connectors');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const [layoutResponse, runsResponse] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/layout`, { cache: 'no-store' }),
        fetch(`/api/workspaces/${workspaceId}/runs?limit=25`, { cache: 'no-store' }),
      ]);
      const [layoutBody, runsBody] = await Promise.all([layoutResponse.json(), runsResponse.json()]);
      if (!layoutResponse.ok || !runsResponse.ok) throw new Error(layoutBody.error || runsBody.error || 'Workspace canvas data is unavailable.');
      const record = layoutBody.result as LayoutRecord;
      if (record) {
        const parsed = canvasLayoutSchema.parse(record.layout);
        if (parsed.workspaceId !== workspaceId) throw new Error('Saved layout belongs to another workspace.');
        setLayout(parsed); setRevision(record.revision);
      } else {
        setLayout(defaultLayout(workspaceId)); setRevision(null);
      }
      const nextRuns = runsBody.result.items as RunSummary[];
      setRuns(nextRuns);
      setSelectedRunId(nextRuns[0]?.id || '');
      setNotice(record ? 'Your saved canvas is loaded.' : 'Showing a local starter layout. Save it when ready.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Workspace canvas data is unavailable.');
    } finally { setBusy(false); }
  }, [workspaceId]);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(async (next: CanvasLayout) => {
    const parsed = canvasLayoutSchema.parse(next);
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/layout`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: parsed, expectedRevision: revision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Canvas could not be saved. Reload if another tab changed it.');
      setLayout(canvasLayoutSchema.parse(body.result.layout));
      setRevision(body.result.revision);
      setNotice('Canvas saved for your account in this workspace.');
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Canvas could not be saved.'); return false; }
    finally { setBusy(false); }
  }, [revision, workspaceId]);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setLayout((current) => current ? ({ ...current, windows: current.windows.map((item) => item.window.id === id ? { ...item, x, y } : item) }) : current);
  }, []);

  const commitPosition = useCallback((id: string, x: number, y: number) => {
    if (!layout || busy) return;
    const next = { ...layout, windows: layout.windows.map((item) => item.window.id === id ? { ...item, x, y } : item) };
    setLayout(next);
    void save(next);
  }, [busy, layout, save]);

  const addRunWindow = useCallback(() => {
    if (!layout || !selectedRunId || layout.windows.some((item) => item.window.kind === 'run_graph' && item.window.target.runId === selectedRunId)) return;
    if (layout.windows.length >= 32) { setError('This canvas already has the maximum of 32 windows.'); return; }
    const run = runs.find((item) => item.id === selectedRunId);
    if (!run) { setError('Choose a run from this workspace.'); return; }
    const next: CanvasLayout = { ...layout, windows: [...layout.windows, {
      window: { id: crypto.randomUUID(), kind: 'run_graph', target: { workspaceId, runId: run.id } },
      x: 920, y: 16 + layout.windows.length * 36, width: 560, height: 520, zIndex: layout.windows.length + 1,
    }] };
    setLayout(next); setNotice('Run window added locally. Save layout to keep it.'); setError(null);
  }, [layout, runs, selectedRunId, workspaceId]);

  const addMonitorWindow = useCallback(() => {
    if (!layout || busy) return;
    if (layout.windows.length >= 32) { setError('This canvas already has the maximum of 32 windows.'); return; }
    if (layout.windows.some((item) => item.window.kind === 'system_monitor' && item.window.target.panel === selectedMonitorPanel)) {
      setError('That monitor panel is already on this canvas.'); return;
    }
    const next: CanvasLayout = { ...layout, windows: [...layout.windows, {
      window: { id: crypto.randomUUID(), kind: 'system_monitor', target: { workspaceId, panel: selectedMonitorPanel } },
      x: 920, y: 16 + layout.windows.length * 36, width: 560, height: 520, zIndex: layout.windows.length + 1,
    }] };
    setLayout(next); setNotice('Read-only monitor added locally. Save layout to keep it.'); setError(null);
  }, [busy, layout, selectedMonitorPanel, workspaceId]);

  const closeWindow = useCallback(async (id: string) => {
    if (!layout || busy || !layout.windows.some((item) => item.window.id === id)) return false;
    const next: CanvasLayout = { ...layout, windows: layout.windows.filter((item) => item.window.id !== id) };
    return save(next);
  }, [busy, layout, save]);

  const focusElement = useCallback((windowId: string) => {
    const element = document.getElementById(`canvas-window-${windowId}`);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView?.({ block: 'center', inline: 'center' });
  }, []);

  const focusInbox = useCallback(() => {
    const item = layout?.windows.find((window) => window.window.kind === 'checkpoint_inbox');
    if (item) focusElement(item.window.id);
  }, [focusElement, layout]);

  const focusRun = useCallback(async (runId: string) => {
    if (!layout) throw new Error('Canvas is not ready.');
    const current = layout.windows.find((item) => item.window.kind === 'run_graph' && item.window.target.runId === runId);
    if (current) { focusElement(current.window.id); return; }
    if (layout.windows.length >= 32) throw new Error('Canvas already has the maximum of 32 windows.');
    const response = await fetch(`/api/workspaces/${workspaceId}/runs/${runId}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok || body.result?.run?.id !== runId || body.result.run.workspace_id !== workspaceId) {
      throw new Error(body.error || 'Run detail is unavailable in this workspace.');
    }
    const run = body.result.run as RunSummary;
    const next: CanvasLayout = { ...layout, windows: [...layout.windows, {
      window: { id: crypto.randomUUID(), kind: 'run_graph', target: { workspaceId, runId } },
      x: 920, y: 16 + layout.windows.length * 36, width: 560, height: 520, zIndex: layout.windows.length + 1,
    }] };
    if (!await save(next)) throw new Error('Run window was not saved. Reload before trying again.');
    setRuns((currentRuns) => [run, ...currentRuns.filter((item) => item.id !== run.id)].slice(0, 25));
    const windowId = next.windows.at(-1)!.window.id;
    requestAnimationFrame(() => focusElement(windowId));
  }, [focusElement, layout, save, workspaceId]);

  const resetLayout = useCallback(() => {
    if (!layout || busy) return false;
    return save(defaultLayout(workspaceId));
  }, [busy, layout, save, workspaceId]);

  const addStartedRun = useCallback(async (runId: string) => {
    const response = await fetch(`/api/workspaces/${workspaceId}/runs/${runId}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Run started, but its detail could not be loaded.');
    const run = body.result.run as RunSummary;
    setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)].slice(0, 25));
    if (!layout || layout.windows.some((item) => item.window.kind === 'run_graph' && item.window.target.runId === runId)) return;
    if (layout.windows.length >= 32) { setError('Run started, but this canvas already has the maximum of 32 windows.'); return; }
    const next = { ...layout, windows: [...layout.windows, {
      window: { id: crypto.randomUUID(), kind: 'run_graph' as const, target: { workspaceId, runId } },
      x: 920, y: 16 + layout.windows.length * 36, width: 560, height: 520, zIndex: layout.windows.length + 1,
    }] };
    setLayout(next);
    setNotice('Run started and added to your canvas. Save layout to keep its window.');
  }, [layout, workspaceId]);

  const runWindowCount = useMemo(() => layout?.windows.filter((item) => item.window.kind === 'run_graph').length ?? 0, [layout]);

  if (!layout) return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white"><p>{busy ? 'Loading your workspace canvas…' : 'Canvas unavailable.'}</p>{error ? <p role="alert" className="mt-3 text-rose-200">{error}</p> : null}</main>;

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">
    <div className="mx-auto max-w-[100rem] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Workspace command center</p><h1 className="mt-2 text-3xl font-black">Your canvas</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">Arrange existing inbox and run views. Your layout is private to your account; workflow state remains in its existing services.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="canvas-run-select">Choose a workspace run</label>
          <select id="canvas-run-select" value={selectedRunId} onChange={(event) => setSelectedRunId(event.target.value)} className="max-w-64 rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm">
            <option value="">Choose a run…</option>{runs.map((run) => <option key={run.id} value={run.id}>{run.definition.key} · {run.status}</option>)}
          </select>
          <button type="button" onClick={addRunWindow} disabled={!selectedRunId || busy} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Add run</button>
          <label className="sr-only" htmlFor="canvas-monitor-select">Choose a read-only monitor</label>
          <select id="canvas-monitor-select" value={selectedMonitorPanel} onChange={(event) => setSelectedMonitorPanel(event.target.value as typeof selectedMonitorPanel)} className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm">
            <option value="connectors">Connector health</option><option value="quotas">Quota settings</option><option value="scheduler">Workspace run summary</option>
          </select>
          <button type="button" onClick={addMonitorWindow} disabled={busy} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Add monitor</button>
          <button type="button" onClick={() => void save(layout)} disabled={busy} className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Saving…' : 'Save layout'}</button>
          <button type="button" onClick={() => void reload()} disabled={busy} className="rounded-md border border-white/15 px-3 py-2 text-sm">Reload</button>
        </div>
      </header>
      <CommandPalette workspaceId={workspaceId} windows={layout.windows} onRunStarted={addStartedRun}
        onFocusInbox={focusInbox} onFocusRun={focusRun} onCloseWindow={closeWindow} onResetLayout={resetLayout} />
      {error ? <div role="alert" className="rounded-md border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {notice ? <p role="status" className="text-xs text-slate-400">{notice}{runWindowCount ? ` · ${runWindowCount} run window${runWindowCount === 1 ? '' : 's'}` : ''}</p> : null}
      <section aria-label="Canvas controls and accessible view list" className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Canvas windows</h2><p className="text-xs text-slate-400">Drag a title bar or use the move buttons. Closing saves immediately; other changes use Save layout.</p></div>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-cyan-100">
          {layout.windows.map((item) => <li key={item.window.id}><a className="underline underline-offset-2" href={`#canvas-window-${item.window.id}`}>{item.window.kind.replaceAll('_', ' ')}</a></li>)}
        </ul>
        <p className="mt-2 text-xs text-slate-500"><Link href={`/workspaces/${workspaceId}/inbox`} className="underline">Open the standard inbox view</Link></p>
      </section>
      <CoordinatePlane zoom={layout.viewport.zoom}>
        {layout.windows.map((item) => {
          const title = item.window.kind === 'checkpoint_inbox' ? 'Checkpoint inbox'
            : item.window.kind === 'run_graph' ? `Run ${item.window.target.runId}`
              : item.window.kind === 'artifact_viewer' ? 'Artifact viewer' : `System monitor · ${item.window.target.panel}`;
          return <WindowFrame key={item.window.id} item={item} title={title} onPosition={updatePosition} onCommitPosition={commitPosition} onClose={closeWindow}>
              {item.window.kind === 'checkpoint_inbox' ? <PlatformInbox workspaceId={workspaceId} embedded />
                : item.window.kind === 'run_graph' ? <RunDetail workspaceId={workspaceId} runId={item.window.target.runId} embedded />
                  : item.window.kind === 'system_monitor' ? <SystemMonitorWindow workspaceId={workspaceId} panel={item.window.target.panel} />
                  : <div className="space-y-2 p-3 text-sm text-slate-300"><p>This window kind has no approved read surface in this slice.</p><p>No data is fetched or changed by this placeholder.</p></div>}
          </WindowFrame>;
        })}
      </CoordinatePlane>
      {layout.windows.length === 0 ? <p className="rounded-lg border border-white/10 p-6 text-sm text-slate-300">No windows on this canvas. Open the standard inbox or add a run.</p> : null}
    </div>
  </main>;
}
