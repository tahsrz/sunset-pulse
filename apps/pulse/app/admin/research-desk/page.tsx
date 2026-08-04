import { headers } from 'next/headers';
import { Beaker, DatabaseZap, LayoutList } from 'lucide-react';
import Link from 'next/link';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import ResearchDesk from '@/components/admin/ResearchDesk';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Research Desk | Sunset Pulse',
  description: 'Collaborative lead investigation queue.',
};

export default async function ResearchDeskPage() {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));

  if (!access.allowed) {
    return <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-100"><section className="mx-auto max-w-3xl border border-rose-300/30 bg-rose-500/10 p-8"><p className="text-sm text-rose-100">{access.reason}</p></section></main>;
  }

  return <main className="min-h-screen bg-zinc-950 text-zinc-100">
    <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),transparent_38%),linear-gradient(135deg,rgba(24,24,27,1),rgba(9,9,11,1))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 text-emerald-200"><Beaker size={19} /><span className="text-[10px] font-black uppercase tracking-[0.24em]">Collaborative Intelligence</span></div>
        <h1 className="mt-4 text-4xl font-black uppercase italic text-white sm:text-5xl">Research Desk</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Unverified MLS and tax signals stay here until the evidence is complete. Promotion changes status only, preserving every note and attachment on the same lead.</p>
        <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-zinc-300"><span className="inline-flex items-center gap-2 border border-white/10 bg-black/20 px-3 py-2"><LayoutList size={14} className="text-emerald-200" />Shared investigation queue</span><span className="inline-flex items-center gap-2 border border-white/10 bg-black/20 px-3 py-2"><DatabaseZap size={14} className="text-cyan-200" />One lead record, end to end</span><Link href="/admin/lead-drafts" className="inline-flex items-center border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-cyan-100">Open outreach drafts</Link></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><ResearchDesk /></section>
  </main>;
}
