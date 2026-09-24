'use client';

import React, { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

type Member = { membership_id: string; user_id: string; email: string | null; role: string; status: string; revision: number };
type Invitation = { id: string; email: string; role: string; status: string; expires_at: string };

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'Workspace access request failed.');
  return body;
}

export function WorkspaceAccessManager({ workspaceId, actorId }: { workspaceId: string; actorId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'reviewer' | 'viewer'>('member');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const actorRole = members.find((member) => member.user_id === actorId)?.role;

  const load = useCallback(async (signal?: AbortSignal) => {
    const [memberResponse, invitationResponse] = await Promise.all([
      fetch(`/api/workspaces/${workspaceId}/members`, { cache: 'no-store', signal }),
      fetch(`/api/workspaces/${workspaceId}/invitations`, { cache: 'no-store', signal }),
    ]);
    const [memberBody, invitationBody] = await Promise.all([readJson(memberResponse), readJson(invitationResponse)]);
    setMembers(Array.isArray(memberBody.result) ? memberBody.result : []);
    setInvitations(Array.isArray(invitationBody.result) ? invitationBody.result : []);
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load workspace access.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage(''); setInviteLink('');
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }),
      });
      const body = await readJson(response);
      const token = body?.result?.token;
      if (typeof token !== 'string' || token.length < 40) throw new Error('Invitation was created without a usable one-time link. Contact an operator; do not retry with a different email.');
      const url = new URL('/workspace-invitations/accept', window.location.origin);
      url.hash = new URLSearchParams({ token }).toString();
      setInviteLink(url.toString());
      setMessage('Invitation created. Delivery was not sent; copy the link and share it with the intended person through your approved channel.');
      setEmail('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create invitation.');
    } finally { setSaving(false); }
  }

  async function revokeInvitation(invitation: Invitation) {
    if (!window.confirm(`Revoke the pending ${invitation.role} invitation for ${invitation.email}?`)) return;
    setError(''); setMessage('');
    try {
      await readJson(await fetch(`/api/workspaces/${workspaceId}/invitations/${invitation.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }),
      }));
      setMessage('Invitation revoked.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to revoke invitation.'); }
  }

  async function revokeMembership(member: Member) {
    if (!window.confirm(`Revoke ${member.role} access for ${member.email || 'this member'}? Their active workspace sessions and future actions will lose access.`)) return;
    setError(''); setMessage('');
    try {
      await readJson(await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membershipId: member.membership_id }),
      }));
      setMessage(`Workspace access revoked for ${member.email || 'the selected member'}.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to revoke workspace access.'); }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage('Invitation link copied.');
    } catch { setMessage('Copy is unavailable. Select and copy the invitation link below.'); }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 text-slate-100 sm:px-6">
      <Link href="/workspaces" className="text-sm text-cyan-200 underline">← All workspaces</Link>
      <header className="mt-5 mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Workspace collaboration</p>
        <h1 className="mt-2 text-3xl font-bold">People and invitations</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Create role-scoped, email-bound access links. Sunset Pulse does not email invitations; the raw token is shown once and is not saved in this browser.</p>
      </header>

      {error ? <p role="alert" className="mb-4 rounded-lg border border-rose-400/40 bg-rose-950/50 p-3 text-sm text-rose-100">{error}</p> : null}
      {message ? <p role="status" className="mb-4 rounded-lg border border-cyan-300/20 bg-cyan-950/40 p-3 text-sm text-cyan-100">{message}</p> : null}

      <section aria-labelledby="invite-heading" className="mb-8 rounded-xl border border-cyan-300/20 bg-slate-900/70 p-5">
        <h2 id="invite-heading" className="text-xl font-semibold">Invite a collaborator</h2>
        <form onSubmit={createInvite} className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium">Their account email</label>
            <input id="invite-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium">Workspace role</label>
            <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="member">Member · start/respond</option>
              <option value="reviewer">Reviewer · review responses</option>
              <option value="viewer">Viewer · read only</option>
            </select>
          </div>
          <button type="submit" disabled={saving || !email.trim()} className="rounded-md bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create invite link'}
          </button>
        </form>
        {inviteLink ? <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-950/20 p-3">
          <label htmlFor="invite-link" className="block text-sm font-semibold text-amber-100">One-time invitation link</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="invite-link" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded border border-white/15 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
            <button type="button" onClick={() => void copyInviteLink()} className="rounded border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/5">Copy link</button>
          </div>
        </div> : null}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="members-heading" className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 id="members-heading" className="text-xl font-semibold">Workspace members</h2>
          {loading ? <p role="status" className="mt-3 text-sm text-slate-400">Loading members…</p> : members.length ? <ul className="mt-4 divide-y divide-white/10">
            {members.map((member) => <li key={member.membership_id} className="flex items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium">{member.email || 'Account email unavailable'}</p><p className="mt-1 text-xs capitalize text-slate-400">{member.role} · {member.status}</p></div>
              {member.role === 'owner' ? <span className="text-xs text-slate-500">Owner</span>
                : member.status === 'active' && (actorRole === 'owner' || (actorRole === 'admin' && member.role !== 'admin'))
                  ? <button type="button" onClick={() => void revokeMembership(member)} className="rounded border border-rose-300/30 px-2.5 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-950/40">Revoke access</button>
                  : null}
            </li>)}
          </ul> : !loading ? <p className="mt-3 text-sm text-slate-400">No member records returned.</p> : null}
        </section>

        <section aria-labelledby="invitations-heading" className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 id="invitations-heading" className="text-xl font-semibold">Invitations</h2>
          {loading ? <p role="status" className="mt-3 text-sm text-slate-400">Loading invitations…</p> : invitations.length ? <ul className="mt-4 divide-y divide-white/10">
            {invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium">{invitation.email}</p><p className="mt-1 text-xs capitalize text-slate-400">{invitation.role} · {invitation.status}</p></div>
              {invitation.status === 'pending' ? <button type="button" onClick={() => void revokeInvitation(invitation)} className="rounded border border-rose-300/30 px-2.5 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-950/40">Revoke invite</button> : null}
            </li>)}
          </ul> : !loading ? <p className="mt-3 text-sm text-slate-400">No invitations found.</p> : null}
        </section>
      </div>
    </main>
  );
}
