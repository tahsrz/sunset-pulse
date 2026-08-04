import { headers } from 'next/headers';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import LeadDraftWorkspace from '@/components/admin/LeadDraftWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Outreach Drafts | Sunset Pulse' };

export default async function LeadDraftsPage() {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));
  if (!access.allowed) return <main className="min-h-screen bg-zinc-950 p-8 text-rose-100">{access.reason}</main>;
  return <main className="min-h-screen bg-zinc-950 text-zinc-100">
    <header className="border-b border-white/10 px-4 py-9 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Collaborative Correspondence</p><h1 className="mt-3 text-4xl font-black uppercase text-white">Outreach Drafts</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Review, edit, approve, print, and archive personalized outreach before it becomes a scheduled lead action.</p></div></header>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><LeadDraftWorkspace /></section>
  </main>;
}
