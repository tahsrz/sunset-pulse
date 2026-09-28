'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, type FormEvent } from 'react';

type WorkspaceEntry = {
  workspace: { id: string; kind: 'personal' | 'team'; name: string; revision: number };
  membership: { role: string };
};

export function WorkspaceHub() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/workspaces', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'Could not load your workspaces.');
        setWorkspaces(Array.isArray(body?.workspaces) ? body.workspaces : []);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load your workspaces.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function createTeamWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'team', name }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.workspaceId !== 'string') {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Could not create the team workspace.');
      }
      router.push(`/workspaces/${body.workspaceId}/inbox`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the team workspace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Sunset Pulse · Operating platform</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Your workspaces</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Choose a workspace to collaborate on intakes and runs, or create a team workspace to begin organizing work together.
          Create a pilot workspace only while signed in to the specifically selected non-production environment. Creating a workspace does not invite anyone or enable workflow scheduling.
        </p>
      </header>

      {error ? <p role="alert" className="mb-6 rounded-lg border border-rose-400/40 bg-rose-950/50 p-3 text-sm text-rose-100">{error}</p> : null}

      <section aria-labelledby="accessible-workspaces" className="mb-10">
        <h2 id="accessible-workspaces" className="text-xl font-semibold">Accessible workspaces</h2>
        {loading ? <p role="status" className="mt-4 text-sm text-slate-400">Loading workspaces…</p>
          : workspaces.length ? <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {workspaces.map(({ workspace, membership }) => (
              <li key={workspace.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{workspace.name}</h3>
                    <p className="mt-1 text-xs capitalize text-slate-400">{workspace.kind} workspace · {membership.role}</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-200">Active</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                  <Link className="rounded-md bg-cyan-300 px-3 py-2 text-slate-950" href={`/workspaces/${workspace.id}/inbox`}>Open inbox</Link>
                  <Link className="rounded-md border border-white/15 px-3 py-2 text-slate-100 hover:bg-white/5" href={`/workspaces/${workspace.id}/canvas`}>Open canvas</Link>
                  {membership.role === 'owner' || membership.role === 'admin' ? <Link className="rounded-md border border-white/15 px-3 py-2 text-slate-100 hover:bg-white/5" href={`/workspaces/${workspace.id}/access`}>Manage access</Link> : null}
                </div>
              </li>
            ))}
          </ul> : <p className="mt-4 rounded-lg border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">No active workspaces yet. Create a team workspace below to start collaborating.</p>}
      </section>

      <section aria-labelledby="create-team" className="max-w-2xl rounded-xl border border-cyan-300/20 bg-slate-900/70 p-5 sm:p-6">
        <h2 id="create-team" className="text-xl font-semibold">Create a team workspace</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">You’ll become its owner. Invite collaborators later through the workspace access flow; this form does not send invitations.</p>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createTeamWorkspace}>
          <div className="flex-1">
            <label htmlFor="workspace-name" className="mb-1 block text-sm font-medium">Workspace name</label>
            <input id="workspace-name" name="name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" placeholder="e.g. Keller–Westlake team" />
          </div>
          <button type="submit" disabled={saving || !name.trim()} className="rounded-md bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Creating…' : 'Create team workspace'}
          </button>
        </form>
      </section>
    </main>
  );
}
