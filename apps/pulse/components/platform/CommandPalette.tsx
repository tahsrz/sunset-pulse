'use client';

import React, { useState, type FormEvent } from 'react';
import type { AppManifest } from '@/lib/platform/contracts/appManifest';
import type { CanvasLayout } from '@/lib/platform/contracts/canvasLayout';
import { parsePlatformCommand } from '@/lib/platform/commands/grammar';
import { ManifestForm } from './ManifestForm';

type RunSummary = { id: string; status: string; revision: number; definition: { key: string; version: number } };
type Install = { id: string; appKey: string; revision: number; status: 'installed' | 'disabled'; manifest: AppManifest };
type Preview =
  | { type: 'runs'; items: RunSummary[]; hasMore: boolean }
  | { type: 'start'; install: Install }
  | { type: 'cancel'; run: RunSummary; complete?: boolean }
  | { type: 'focus'; target: { type: 'inbox' } | { type: 'run'; run: RunSummary } }
  | { type: 'close'; windowId: string; complete?: boolean }
  | { type: 'reset'; complete?: boolean };

async function readResult<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Command could not be completed.');
  return body.result as T;
}

export function CommandPalette({ workspaceId, windows, onRunStarted, onFocusInbox, onFocusRun, onCloseWindow, onResetLayout }: {
  workspaceId: string;
  windows: CanvasLayout['windows'];
  onRunStarted?: (runId: string) => void | Promise<void>;
  onFocusInbox: () => void;
  onFocusRun: (runId: string) => void | Promise<void>;
  onCloseWindow: (windowId: string) => boolean | Promise<boolean>;
  onResetLayout: () => boolean | Promise<boolean>;
}) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [formValue, setFormValue] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function loadRuns(): Promise<RunSummary[]> {
    const result = await readResult<{ items: RunSummary[]; nextCursor: string | null }>(
      await fetch(`/api/workspaces/${workspaceId}/runs?limit=25`, { cache: 'no-store' }),
    );
    return result.items;
  }

  async function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsePlatformCommand(input);
    setError(null); setNotice(''); setPreview(null); setFormValue({});
    if (!parsed.ok) { setError(parsed.error); return; }
    const command = parsed.command;
    setBusy(true);
    try {
      if (command.type === 'list_runs') {
        const result = await readResult<{ items: RunSummary[]; nextCursor: string | null }>(
          await fetch(`/api/workspaces/${workspaceId}/runs?limit=25`, { cache: 'no-store' }),
        );
        setPreview({ type: 'runs', items: result.items, hasMore: Boolean(result.nextCursor) });
      } else if (command.type === 'cancel_run') {
        const runs = await loadRuns();
        const run = runs.find((item) => item.id === command.runId);
        if (!run) throw new Error('Run was not found in the first 25 workspace runs. Refresh the runs list before cancelling.');
        setPreview({ type: 'cancel', run });
      } else if (command.type === 'start_app') {
        const installs = await readResult<Install[]>(
          await fetch(`/api/workspaces/${workspaceId}/apps`, { cache: 'no-store' }),
        );
        const install = installs.find((item) => item.status === 'installed' && item.appKey === command.appKey && item.manifest.version === command.version);
        if (!install) throw new Error('That manifest version is not installed and active in this workspace.');
        setPreview({ type: 'start', install });
      } else if (command.type === 'focus_inbox') {
        if (!windows.some((window) => window.window.kind === 'checkpoint_inbox')) throw new Error('No checkpoint inbox window is currently on this canvas.');
        setPreview({ type: 'focus', target: { type: 'inbox' } });
      } else if (command.type === 'focus_run') {
        const runs = await loadRuns();
        const run = runs.find((item) => item.id === command.runId);
        if (!run) throw new Error('Run was not found in the first 25 workspace runs.');
        setPreview({ type: 'focus', target: { type: 'run', run } });
      } else if (command.type === 'close_window') {
        if (!windows.some((window) => window.window.id === command.windowId)) throw new Error('That window is not present on your canvas.');
        setPreview({ type: 'close', windowId: command.windowId });
      } else {
        setPreview({ type: 'reset' });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Command could not be completed.');
    } finally { setBusy(false); }
  }

  async function confirmPresentationCommand() {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      if (preview.type === 'focus') {
        if (preview.target.type === 'inbox') onFocusInbox();
        else await onFocusRun(preview.target.run.id);
        setNotice('Canvas focus updated. No workflow state changed.');
      } else if (preview.type === 'close') {
        if (!await onCloseWindow(preview.windowId)) throw new Error('Window close was not saved. Reload before retrying if another tab changed the layout.');
        setPreview({ ...preview, complete: true });
        setNotice('Window closed in your private canvas.');
      } else if (preview.type === 'reset') {
        const saved = await onResetLayout();
        if (!saved) throw new Error('Layout reset was not saved. Reload before retrying if another tab changed it.');
        setPreview({ ...preview, complete: true });
        setNotice('Your private canvas layout was reset.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Canvas command could not be completed.');
    } finally { setBusy(false); }
  }

  async function cancelConfirmed() {
    if (preview?.type !== 'cancel' || preview.complete) return;
    setBusy(true); setError(null);
    try {
      await readResult(await fetch(`/api/workspaces/${workspaceId}/runs`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: preview.run.id, expectedRevision: preview.run.revision }),
      }));
      setPreview({ ...preview, complete: true });
      setNotice('Cancellation request accepted by the workspace run API.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Run cancellation failed. Reload the run before retrying.');
    } finally { setBusy(false); }
  }

  async function startConfirmed(values: Record<string, unknown>) {
    if (preview?.type !== 'start') return;
    setBusy(true); setError(null);
    try {
      const result = await readResult<Record<string, unknown>>(await fetch(`/api/workspaces/${workspaceId}/apps/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installId: preview.install.id,
          expectedInstallRevision: preview.install.revision,
          workflowKey: preview.install.manifest.workflows[0].key,
          requestKey: crypto.randomUUID(), inputs: values, resourceRefs: [],
        }),
      }));
      const possibleRunId = result.run_id ?? result.runId ?? result.id;
      const runId = typeof possibleRunId === 'string' && zodUuid(possibleRunId) ? possibleRunId : null;
      setPreview(null); setNotice('Launch accepted by the workspace app-launch API.');
      if (runId && onRunStarted) {
        try { await onRunStarted(runId); }
        catch { setNotice('Launch was accepted, but the run window could not be loaded. Reload the workspace canvas.'); }
      } else setNotice('Launch accepted. Reload the run list to open its run window.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'App launch failed.');
    } finally { setBusy(false); }
  }

  return <section aria-label="Workspace command palette" className="rounded-lg border border-cyan-200/20 bg-slate-900/70 p-3">
    <h2 className="text-sm font-bold">Command palette</h2>
    <p className="mt-1 text-xs text-slate-400">Only reviewed workspace commands are accepted. Mutations always show a confirmation or input form first.</p>
    <form onSubmit={submitCommand} className="mt-3 flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="platform-command-input">Workspace command</label>
      <input id="platform-command-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={256}
        placeholder="/ps · /start app-key@1 · :focus inbox" className="min-w-64 flex-1 rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm" />
      <button type="submit" disabled={busy} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Working…' : 'Preview'}</button>
    </form>
    {error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
    {preview?.type === 'runs' ? <div className="mt-3 space-y-2" aria-live="polite">
      <h3 className="text-sm font-semibold">Recent runs · first 25</h3>
      {preview.items.length ? <ul className="space-y-1">{preview.items.map((run) => <li key={run.id} className="text-xs text-slate-300">{run.definition.key} · {run.status} · {run.id}</li>)}</ul> : <p className="text-xs text-slate-400">No runs found.</p>}
      {preview.hasMore ? <p className="text-xs text-slate-500">More runs exist; this command displays only the bounded first page.</p> : null}
    </div> : null}
    {preview?.type === 'cancel' ? <div className="mt-3 space-y-2 rounded-md border border-amber-200/20 p-3" aria-live="polite">
      <p className="text-sm">{preview.complete ? 'Cancellation submitted.' : 'Confirm cancellation'} — {preview.run.definition.key}, status {preview.run.status}, revision {preview.run.revision}.</p>
      {!preview.complete ? <button type="button" onClick={() => void cancelConfirmed()} disabled={busy} className="rounded-md bg-amber-200 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Confirm cancel</button> : null}
    </div> : null}
    {preview?.type === 'focus' ? <div className="mt-3 space-y-2 rounded-md border border-cyan-200/20 p-3" aria-live="polite">
      <p className="text-sm">{preview.target.type === 'inbox' ? 'Focus the visible checkpoint inbox window?' : `Focus or open run ${preview.target.run.definition.key} (${preview.target.run.id})?`}</p>
      <button type="button" onClick={() => void confirmPresentationCommand()} disabled={busy} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Confirm focus</button>
    </div> : null}
    {preview?.type === 'close' ? <div className="mt-3 space-y-2 rounded-md border border-white/15 p-3" aria-live="polite">
      <p className="text-sm">{preview.complete ? 'Window closed.' : `Close canvas window ${preview.windowId}? This does not cancel or modify its run.`}</p>
      {!preview.complete ? <button type="button" onClick={() => void confirmPresentationCommand()} disabled={busy} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Confirm close window</button> : null}
    </div> : null}
    {preview?.type === 'reset' ? <div className="mt-3 space-y-2 rounded-md border border-amber-200/20 p-3" aria-live="polite">
      <p className="text-sm">{preview.complete ? 'Canvas layout reset.' : 'Reset only your saved canvas layout to the starter inbox? Runs and checkpoints will not be changed.'}</p>
      {!preview.complete ? <button type="button" onClick={() => void confirmPresentationCommand()} disabled={busy} className="rounded-md bg-amber-200 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Confirm reset layout</button> : null}
    </div> : null}
    {preview?.type === 'start' ? <div className="mt-3 space-y-3 rounded-md border border-cyan-200/20 p-3">
      <div><h3 className="text-sm font-semibold">Confirm app intake</h3><p className="text-xs text-slate-400">{preview.install.manifest.title} · {preview.install.appKey}@{preview.install.manifest.version} · workflow {preview.install.manifest.workflows[0].key}</p></div>
      <ManifestForm schema={preview.install.manifest.inputSchema} value={formValue} onChange={setFormValue} onSubmit={startConfirmed} submitLabel="Confirm and launch" disabled={busy} />
    </div> : null}
  </section>;
}

function zodUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
