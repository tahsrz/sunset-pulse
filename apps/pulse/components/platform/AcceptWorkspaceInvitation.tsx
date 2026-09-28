'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AcceptWorkspaceInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState(token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const key = 'sunset-pulse.workspace-invitation-token';
    const hydrateToken = () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      if (params.has('token')) {
        const fragment = params.get('token') || '';
        if (fragment) window.sessionStorage.setItem(key, fragment);
        else window.sessionStorage.removeItem(key);
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
        setInviteToken(fragment);
        return;
      }
      const stored = window.sessionStorage.getItem(key);
      const resolved = token || stored || '';
      if (resolved) window.sessionStorage.setItem(key, resolved);
      setInviteToken(resolved);
    };
    hydrateToken();
    window.addEventListener('hashchange', hydrateToken);
    return () => window.removeEventListener('hashchange', hydrateToken);
  }, [token]);

  async function accept() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/workspace-invitations/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: inviteToken }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        const target = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?redirect=${encodeURIComponent(target)}`);
        return;
      }
      if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'This invitation could not be accepted.');
      const workspaceId = body?.workspace_id;
      if (typeof workspaceId !== 'string') throw new Error('The invitation response did not include a workspace. Contact the workspace owner.');
      window.sessionStorage.removeItem('sunset-pulse.workspace-invitation-token');
      router.push(`/workspaces/${workspaceId}/inbox`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This invitation could not be accepted.');
    } finally { setBusy(false); }
  }

  const validToken = /^[A-Za-z0-9_-]{40,64}$/.test(inviteToken);
  return <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-12 text-slate-100">
    <section className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Workspace collaboration</p>
      <h1 className="mt-2 text-2xl font-bold">Accept workspace invitation</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Sign in with the email address this invitation was sent to. Access is added only after you confirm below. The one-time token stays in this browser tab and is not included in the page request URL.</p>
      {error ? <p role="alert" className="mt-4 rounded border border-rose-400/40 bg-rose-950/50 p-3 text-sm text-rose-100">{error}</p> : null}
      {!validToken ? <p role="alert" className="mt-4 text-sm text-rose-100">This invitation link is missing or malformed. Ask the workspace owner for a new link.</p> : null}
      <button type="button" disabled={!validToken || busy} onClick={() => void accept()} className="mt-5 rounded-md bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">
        {busy ? 'Checking invitation…' : 'Confirm and join workspace'}
      </button>
      <p className="mt-4 text-xs text-slate-500">The signed-in account email is verified by the server. Reusing an already accepted invite by the same account is safe.</p>
    </section>
  </main>;
}
